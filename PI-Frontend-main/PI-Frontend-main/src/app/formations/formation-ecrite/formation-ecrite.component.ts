import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { FormationService } from '../services/formation.service';
import { Formation } from '../models/formation.model';

@Component({
  selector: 'app-formation-ecrite',
  standalone: false,
  templateUrl: './formation-ecrite.component.html',
  styleUrls: ['./formation-ecrite.component.scss']
})
export class FormationEcriteComponent implements OnInit {
  formation!:   Formation;
  loading     = true;
  candidatId: number | null = null;
  safeHtml:   SafeHtml | null = null;
  sourceLabel = '';
  docResults: any[] = [];
  selectedIndex = 0;
  googleNotConfigured = false;

  private sanitizer        = inject(DomSanitizer);
  private route            = inject(ActivatedRoute);
  private formationService = inject(FormationService);
  private http             = inject(HttpClient);

  private readonly base = '/api';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.candidatId = Number(localStorage.getItem('candidatId')) || null;
    this.formationService.getFormationById(id).subscribe({
      next: (f) => { this.formation = f; this.loadContent(f); },
      error: ()  => { this.loading = false; }
    });
  }

  private loadContent(f: Formation): void {
    const w = f.writtenUrl || '';

    if (w && w.startsWith('http')) {
      this.sourceLabel = this.extractDomain(w);
      this.loadViaProxy(w);
    } else {
      this.searchAndLoad(f.titre, f.categorie);
    }
  }

  private searchAndLoad(titre: string, categorie: string): void {
    this.sourceLabel = 'Recherche en cours...';

    this.http.get<any>(
      `${this.base}/suggestions/docs/auto` +
      `?titre=${encodeURIComponent(titre)}`
    ).subscribe({
      next: (data) => {
        if (data.error) {
          this.googleNotConfigured = true;
          this.showGoogleNotConfigured();
          return;
        }

        this.docResults = data.results || [];

        if (this.docResults.length > 0) {
          this.selectResult(0);
        } else {
          this.showNoContent(titre);
        }
      },
      error: () => this.showNoContent(titre)
    });
  }

  selectResult(index: number): void {
    if (index < 0 || index >= this.docResults.length) return;
    this.selectedIndex = index;
    const result       = this.docResults[index];
    this.sourceLabel   = result.source || '';
    this.loading       = true;
    this.safeHtml      = null;

    this.loadViaProxy(result.url);
  }

  private loadViaProxy(url: string): void {
    this.http.get(
      `${this.base}/proxy/fetch?url=${encodeURIComponent(url)}`,
      { responseType: 'text' }
    ).subscribe({
      next: (html) => {
        const processedHtml = this.rewriteRelativeUrls(html, url);
        this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(processedHtml);
        this.loading  = false;
      },
      error: () => {
        // Site bloque le proxy → message avec snippet
        const current = this.docResults[this.selectedIndex];
        this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(
          this.buildSnippetCard(current)
        );
        this.loading = false;
      }
    });
  }

  onProxyLinkClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    
    if (anchor && anchor.getAttribute('data-proxy-link') === 'true') {
      const href = anchor.getAttribute('href');
      
      if (href && href.startsWith('http')) {
        event.preventDefault(); // Annuler l'ouverture du vrai site
        this.loading = true;
        this.safeHtml = null;
        window.scrollTo(0, 0);  // Remonter
        this.loadViaProxy(href); // Re-télécharger via le proxy !
      }
    }
  }

  private rewriteRelativeUrls(html: string, baseUrl: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    try {
      const base = new URL(baseUrl);

      doc.querySelectorAll('img').forEach((el: Element) => {
        const img = el as HTMLImageElement;
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
          try { img.setAttribute('src', new URL(src, base.href).href); } catch (e) {}
        }

        const srcset = img.getAttribute('srcset');
        if (srcset) {
          const newSrcset = srcset.split(',').map(part => {
            const parts = part.trim().split(' ');
            const srcPart = parts[0];
            if (srcPart && !srcPart.startsWith('http') && !srcPart.startsWith('data:')) {
              try { parts[0] = new URL(srcPart, base.href).href; } catch(e){}
            }
            return parts.join(' ');
          }).join(', ');
          img.setAttribute('srcset', newSrcset);
        }
      });

      doc.querySelectorAll('link').forEach((el: Element) => {
        const link = el as HTMLLinkElement;
        const rel = link.getAttribute('rel');
        const href = link.getAttribute('href');
        if (href && rel && rel.toLowerCase().includes('stylesheet') && !href.startsWith('http') && !href.startsWith('data:')) {
          try { link.setAttribute('href', new URL(href, base.href).href); } catch (e) {}
        }
      });

      doc.querySelectorAll('a').forEach((el: Element) => {
        const a = el as HTMLAnchorElement;
        const href = a.getAttribute('href');
        
        if (href && !href.startsWith('mailto:') && !href.startsWith('javascript:') && !href.startsWith('#')) {
          try { 
            const absUrl = new URL(href, base.href).href;
            a.setAttribute('href', absUrl);
            a.setAttribute('data-proxy-link', 'true'); // On indique qu'on va intercepter
          } catch(e) {}
        }
      });

      doc.querySelectorAll('use').forEach((use: Element) => {
        const href = use.getAttribute('href') || use.getAttribute('xlink:href');
        if (href && !href.startsWith('http') && !href.startsWith('data:') && !href.startsWith('#')) {
          try {
            const newHref = new URL(href, base.href).href;
            if (use.hasAttribute('href')) use.setAttribute('href', newHref);
            if (use.hasAttribute('xlink:href')) use.setAttribute('xlink:href', newHref);
          } catch(e) {}
        }
      });

    } catch (e) {
      console.warn("Impossible d'analyser l'URL de base pour la réécriture:", e);
    }

    return doc.documentElement.outerHTML;
  }

  private buildSnippetCard(result: any): string {
    if (!result) return this.buildNoContentHtml('');
    return `
      <div style="font-family:sans-serif;padding:32px;max-width:700px;margin:0 auto">
        <div style="background:#E6F1FB;border-radius:12px;
                    padding:20px 24px;margin-bottom:24px">
          <h2 style="margin:0 0 8px;color:#0965A4;font-size:1.2rem">
            ${result.title || ''}
          </h2>
          <p style="margin:0;color:#374151;font-size:0.95rem;line-height:1.6">
            ${result.snippet || ''}
          </p>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;
                    border-radius:10px;padding:16px 20px;
                    display:flex;align-items:center;gap:12px">
          <span style="font-size:20px">🔗</span>
          <div>
            <p style="margin:0 0 4px;font-size:0.875rem;color:#166534;font-weight:600">
              Ce site ne peut pas être affiché directement dans l'app.
            </p>
            <a href="${result.url}" target="_blank" rel="noopener"
               style="color:#0965A4;font-size:0.875rem;font-weight:600">
              Ouvrir ${result.source} dans un nouvel onglet →
            </a>
          </div>
        </div>
      </div>`;
  }

  private showGoogleNotConfigured(): void {
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(`
      <div style="font-family:sans-serif;padding:40px;max-width:600px;
                  margin:0 auto;text-align:center">
        <span style="font-size:48px;display:block;margin-bottom:16px">⚙️</span>
        <h3 style="color:#1a1a2e;margin-bottom:12px">
          Configuration requise
        </h3>
        <p style="color:#6b7280;margin-bottom:20px;line-height:1.6">
          La recherche automatique de documentation nécessite une clé
          <strong>Google Custom Search API</strong>.
        </p>
        <div style="background:#fef3c7;border:1px solid #fbbf24;
                    border-radius:10px;padding:16px 20px;text-align:left">
          <p style="margin:0 0 8px;font-weight:600;color:#92400e">
            Dans application.properties :
          </p>
          <code style="font-size:0.85rem;color:#92400e;display:block;
                       line-height:2">
            google.search.api.key=AIza...<br>
            google.search.cx=...
          </code>
        </div>
        <p style="margin-top:16px;font-size:0.85rem;color:#6b7280">
          Obtenir gratuitement sur
          <a href="https://console.cloud.google.com" target="_blank"
             style="color:#0965A4">console.cloud.google.com</a>
          et
          <a href="https://cse.google.com" target="_blank"
             style="color:#0965A4">cse.google.com</a>
        </p>
      </div>
    `);
    this.loading = false;
  }

  private showNoContent(titre: string): void {
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(
      this.buildNoContentHtml(titre)
    );
    this.loading = false;
  }

  private buildNoContentHtml(titre: string): string {
    return `
      <div style="font-family:sans-serif;padding:40px;text-align:center">
        <span style="font-size:48px;display:block;margin-bottom:16px">📚</span>
        <h3 style="color:#1a1a2e;margin-bottom:8px">
          Aucune documentation trouvée
        </h3>
        <p style="color:#6b7280">
          ${titre
            ? `Aucun résultat pour <strong>${titre}</strong>.`
            : 'Aucun résultat trouvé.'}
        </p>
      </div>`;
  }

  private extractDomain(url: string): string {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
  }
}
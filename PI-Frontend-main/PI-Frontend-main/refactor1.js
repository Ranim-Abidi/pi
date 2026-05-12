const fs = require('fs');
const path = require('path');

const srcAdminDir = 'c:/Users/User/PI-Frontend/src/app/formations/admin';
const destAdminDir = 'c:/Users/User/PI-Frontend/src/app/admin-dashboard';

const components = [
  'formation-create',
  'formation-edit',
  'formation-participants',
  'feedback-admin'
];

// 1. Move folders
components.forEach(comp => {
  const fromPath = path.join(srcAdminDir, comp);
  const toPath = path.join(destAdminDir, comp);
  if (fs.existsSync(fromPath)) {
    fs.renameSync(fromPath, toPath);
  }
});

// 2. Fix HTML and TS contents in their new location
components.forEach(comp => {
  const compDir = path.join(destAdminDir, comp);
  const htmlPath = path.join(compDir, `${comp}.component.html`);
  const tsPath = path.join(compDir, `${comp}.component.ts`);
  
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/<app-navbar\s*\/?>/g, '');
    html = html.replace(/<app-footer\s*\/?>/g, '');
    html = html.replace(/<ngx-scrolltop\s*\/?>/g, '');
    
    // Remove page-banner-area (very naive, assumes standard formatting and exact closing div depth)
    html = html.replace(/<div class="page-banner-area">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/, '');
    
    // Fix router Links
    html = html.replace(/routerLink="\/formations\/admin"/g, 'routerLink="/admin-dashboard/formations"');
    // For feedback and participants back links
    html = html.replace(/\/formations\/admin/g, '/admin-dashboard/formations');
    
    fs.writeFileSync(htmlPath, html, 'utf8');
  }

  if (fs.existsSync(tsPath)) {
    let ts = fs.readFileSync(tsPath, 'utf8');
    
    // Fix relative imports: since they moved from formations/admin/<comp> to admin-dashboard/<comp>
    // The relative distance to formations folder changes
    // it was: '../../services/formation.service' or '../../models/formation.model'
    // now it is: '../../formations/services/formation.service' 
    ts = ts.replace(/\.\.\/\.\.\/services\//g, '../../formations/services/');
    ts = ts.replace(/\.\.\/\.\.\/models\//g, '../../formations/models/');
    
    // Fix router.navigate
    ts = ts.replace(/\['\/formations\/admin'\]/g, "['/admin-dashboard/formations']");
    
    // also feedback admin has router route to /formations/admin/..
    ts = ts.replace(/\['\/formations\/admin'/g, "['/admin-dashboard/formations'");
    
    fs.writeFileSync(tsPath, ts, 'utf8');
  }
});

// 3. Update FormationsModule (Removing the 4 components)
const fmPath = 'c:/Users/User/PI-Frontend/src/app/formations/formations.module.ts';
let fm = fs.readFileSync(fmPath, 'utf8');
fm = fm.replace(/import \{ FormationCreateComponent.*?\n/g, '');
fm = fm.replace(/import \{ FormationEditComponent.*?\n/g, '');
fm = fm.replace(/import \{ FormationParticipantsComponent.*?\n/g, '');
fm = fm.replace(/import \{ FeedbackAdminComponent.*?\n/g, '');
fm = fm.replace(/FormationCreateComponent,\n/g, '');
fm = fm.replace(/FormationEditComponent,\n/g, '');
fm = fm.replace(/FormationParticipantsComponent,\n/g, '');
fm = fm.replace(/FeedbackAdminComponent,\n/g, '');
fs.writeFileSync(fmPath, fm, 'utf8');

console.log("Refactoring part 1 completed");

const fs = require('fs');
const path = require('path');

const srcAdminDir = 'c:/Users/User/PI-Frontend/src/app/formations/admin';
const destAdminDir = 'c:/Users/User/PI-Frontend/src/app/admin-dashboard';

const comp = 'formations-admin';
const fromPath = path.join(srcAdminDir, comp);
const toPath = path.join(destAdminDir, comp);

// 1. Move folder
if (fs.existsSync(fromPath)) {
  fs.renameSync(fromPath, toPath);
}

// 2. Fix HTML and TS
const compDir = toPath;
const htmlPath = path.join(compDir, `${comp}.component.html`);
const tsPath = path.join(compDir, `${comp}.component.ts`);

if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(/<app-navbar\s*\/?>/g, '');
  html = html.replace(/<app-footer\s*\/?>/g, '');
  html = html.replace(/<ngx-scrolltop\s*\/?>/g, '');
  
  // Remove page-banner-area entirely
  html = html.replace(/<div class="page-banner-area">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/, '');
  
  // They probably didn't want the button to point to public, let's change public routerLink "/formations" to "/admin-dashboard/formations" 
  // or just remove the list-btn if they meant something else? I'll leave it but point it to admin.
  html = html.replace(/routerLink="\/formations"/g, 'routerLink="/admin-dashboard/formations"');

  // Fix general admin routerlinks (participants, edit, feedbacks, etc.)
  html = html.replace(/\"\[\'\/formations\/admin\'/g, '"[\'/admin-dashboard/formations\'');
  html = html.replace(/\"\[\'\/formations\/admin\/edit\'/g, '"[\'/admin-dashboard/formations/edit\'');
  html = html.replace(/routerLink=\"\/formations\/admin\/create\"/g, 'routerLink="/admin-dashboard/formations/create"');
  
  fs.writeFileSync(htmlPath, html, 'utf8');
}

if (fs.existsSync(tsPath)) {
  let ts = fs.readFileSync(tsPath, 'utf8');
  ts = ts.replace(/\.\.\/\.\.\/models\//g, '../../formations/models/');
  ts = ts.replace(/\.\.\/\.\.\/services\//g, '../../formations/services/');
  
  fs.writeFileSync(tsPath, ts, 'utf8');
}

// 3. Update app.module.ts
const amPath = 'c:/Users/User/PI-Frontend/src/app/app.module.ts';
let am = fs.readFileSync(amPath, 'utf8');
// remove FormationListComponent import
am = am.replace(/import \{ FormationListComponent \} from \'.\/admin-dashboard\/formation-list\/formation-list\.component\';\n/, '');
// add FormationsAdminComponent import
am = am.replace(/import \{ EntretienListComponent \}.*?\n/, "import { EntretienListComponent } from './admin-dashboard/entretien-list/entretien-list.component';\nimport { FormationsAdminComponent } from './admin-dashboard/formations-admin/formations-admin.component';\n");
// replace in declarations
am = am.replace(/FormationListComponent,\n/, 'FormationsAdminComponent,\n');
fs.writeFileSync(amPath, am, 'utf8');

// 4. Update FormationsModule
const fmPath = 'c:/Users/User/PI-Frontend/src/app/formations/formations.module.ts';
if (fs.existsSync(fmPath)) {
  let fm = fs.readFileSync(fmPath, 'utf8');
  fm = fm.replace(/import \{ FormationsAdminComponent.*?\n/g, '');
  fm = fm.replace(/FormationsAdminComponent,\n?/g, '');
  fs.writeFileSync(fmPath, fm, 'utf8');
}

// 5. Update app.routes.ts
const arPath = 'c:/Users/User/PI-Frontend/src/app/app.routes.ts';
let ar = fs.readFileSync(arPath, 'utf8');
ar = ar.replace(/import \{ FormationListComponent.*?\n/, '');
ar = ar.replace(/import \{ EntretienListComponent.*?\n/, "import { EntretienListComponent } from './admin-dashboard/entretien-list/entretien-list.component';\nimport { FormationsAdminComponent } from './admin-dashboard/formations-admin/formations-admin.component';\n");
ar = ar.replace(/\{ path: 'formations', component: FormationListComponent \},/, "{ path: 'formations', component: FormationsAdminComponent },");
fs.writeFileSync(arPath, ar, 'utf8');

console.log("Move formations-admin completed");

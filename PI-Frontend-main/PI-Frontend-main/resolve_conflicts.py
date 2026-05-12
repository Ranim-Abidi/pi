#!/usr/bin/env python3
import re
import os

conflict_files = [
    "package.json",
    "package-lock.json",
    "src/app/candidates-dashboard/cd-header/cd-header.component.ts",
    "src/app/pages/public-test-pass-page/public-test-pass-page.component.scss",
    "src/app/pages/public-test-pass-page/public-test-pass-page.component.ts",
    "src/app/recruiter-dashboard/offre-recherche-avancee/offre-recherche-avancee.component.html",
    "src/app/recruiter-dashboard/offre-recherche-avancee/offre-recherche-avancee.component.ts"
]

for file_path in conflict_files:
    if not os.path.exists(file_path):
        print(f"⚠️  Fichier non trouvé: {file_path}")
        continue
    
    print(f"\n📁 Traitement: {file_path}")
    
    # Lire le fichier
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Vérifier si le fichier contient des marqueurs de conflit
    if '<<<<<<< HEAD' not in content:
        print(f"   ℹ️  Pas de conflit trouvé dans {file_path}")
        continue
    
    # Pattern pour extraire les sections de conflit
    pattern = r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [a-f0-9]+\n'
    
    matches = re.finditer(pattern, content, re.DOTALL)
    
    conflict_count = 0
    for match in matches:
        conflict_count += 1
        head_section = match.group(1)
        merge_section = match.group(2)
        
        # Sauvegarder les versions individuelles pour chaque conflit
        base_name = f"{file_path}.conflict{conflict_count}"
        
        with open(f"{base_name}.HEAD", 'w', encoding='utf-8') as f:
            f.write(head_section)
        print(f"   ✅ Sauvegardé: {base_name}.HEAD")
        
        with open(f"{base_name}.MERGE", 'w', encoding='utf-8') as f:
            f.write(merge_section)
        print(f"   ✅ Sauvegardé: {base_name}.MERGE")
    
    # Remplacer les marqueurs de conflit en gardant les deux versions commentées
    def replace_conflict(match):
        head_section = match.group(1)
        merge_section = match.group(2)
        
        # Déterminer le type de fichier pour commenter approprié
        if file_path.endswith('.json'):
            # Pour JSON, ne pas ajouter de commentaires car ça casser la syntaxe
            # On va juste prendre la version HEAD pour maintenant
            return head_section + '\n'
        elif file_path.endswith('.ts'):
            # Pour TypeScript, ajouter des commentaires
            return f"""/* === VERSION HEAD === */
{head_section}
/* === VERSION MERGE === */
{merge_section}
/* === FIN VERSIONS === */
"""
        elif file_path.endswith('.scss'):
            # Pour SCSS, utiliser les commentaires appropriés
            return f"""/* === VERSION HEAD === */
{head_section}
/* === VERSION MERGE === */
{merge_section}
/* === FIN VERSIONS === */
"""
        elif file_path.endswith('.html'):
            # Pour HTML, utiliser les commentaires HTML
            return f"""<!-- === VERSION HEAD === -->
{head_section}
<!-- === VERSION MERGE === -->
{merge_section}
<!-- === FIN VERSIONS === -->
"""
        else:
            # Par défaut, garder juste la version HEAD
            return head_section + '\n'
    
    # Résoudre les conflits
    resolved_content = re.sub(pattern, replace_conflict, content, flags=re.DOTALL)
    
    # Écrire le fichier résolu
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(resolved_content)
    print(f"   ✅ Fichier résolu: {file_path}")

print("\n" + "="*50)
print("✅ Résolution des conflits terminée!")
print("="*50)
print("\nFichiers .HEAD et .MERGE créés pour chaque conflit")
print("Les conflits dans les fichiers ont été résolus")

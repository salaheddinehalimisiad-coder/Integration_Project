#!/usr/bin/env python3
"""Script pour mettre à jour les appels current_user avec JWT obligatoire"""

file_path = r"c:\Users\salah\Desktop\integration_project\main.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remplacer tous les appels current_user(authorization) par require_token=True
new_content = content.replace(
    'user = current_user(authorization)',
    'user = current_user(authorization, require_token=True)'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✓ Mise à jour complétée: JWT obligatoire sur tous les endpoints")

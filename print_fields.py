import yaml
with open('public/admin/config.yml', 'r') as f:
    config = yaml.safe_load(f)

for c in config.get('collections', []):
    if c.get('name') == 'courses':
        fields = [f.get('name') for f in c.get('fields', [])]
        print(fields)
        print("sortable_fields:", c.get('sortable_fields'))

import os, glob

agents = glob.glob('.github/agents/*.agent.md')
for agent in agents:
    name = os.path.basename(agent).replace('.agent.md', '')
    skill_dir = f'.agents/skills/{name}'
    os.makedirs(skill_dir, exist_ok=True)
    with open(agent, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if content.startswith('---\n'):
        content = content.replace('---\n', f'---\nname: {name}\n', 1)
    else:
        # If no frontmatter, add it
        content = f"---\nname: {name}\ndescription: SpecKit skill {name}\n---\n" + content

    with open(f'{skill_dir}/SKILL.md', 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Migrated {len(agents)} skills to Antigravity format.")

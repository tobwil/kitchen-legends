# Oui, Chef! – Kitchen Legends

Ein Arcade-Spiel fürs Handy über den Druck einer Sterneküche. Du stehst am Pass: Bons rattern aus dem Drucker, Pfannen zischen, Saucen blubbern – und irgendwo an Tisch 9 sitzt jemand vom Guide und macht sich Notizen.

## Spielen

Lokal einen Server starten und im Browser öffnen (am besten im Hochformat am Handy oder mit Handy-Ansicht in den Entwickler-Tools):

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` öffnen.

Als einzelne Datei bauen (z. B. zum Teilen):

```bash
python3 tools/build_artifact.py dist/oui-chef.html
```

## So geht's

| Station | Was du tust |
| --- | --- |
| Pfanne | Tippen zum Starten, bei **FLIP!** tippen, im **goldenen Ring** rausziehen |
| Saucier | Tippen, im goldenen Ring rausziehen |
| Ofen | Wie Saucier, nur langsamer |
| Garde-manger | Tippen, dann 3× quer über die Station wischen |
| Pâtisserie | Gedrückt halten und die Temperatur im goldenen Band halten |
| Pass | Fertigen Teller antippen, **Sauce mit dem Finger ziehen**, Glocke schlagen: **SERVICE!** |

Gute Teller in Folge bauen **Flow** auf (Punkte-Multiplikator). Verbrannte Pfannen, zu lange wartende Tische und schwache Teller erhöhen den **Druck** – bei 100 bist du **im Weeds**.

## Struktur

- `js/data.js` – Stationen, Zutaten, Gerichte, Abende, Upgrades
- `js/service.js` – der Service-Abend (Canvas, Spiellogik, Eingabe, Effekte)
- `js/meta.js` – Titel, Karriere-Karte, Briefing, Ergebnis, Guide-Anruf, Laden, Tagesservice
- `js/audio.js` – synthetischer Klang (Zischen, Bondrucker, Glocke, Herzschlag-Beat)
- `GAME_DESIGN.md` – Designidee, Spielschleifen, Ausblick

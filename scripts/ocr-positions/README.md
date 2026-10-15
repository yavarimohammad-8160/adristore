Offline tool used to generate the source:"ocr" overrides in data/player-positions.json.
Needs tesseract-ocr + imagemagick. run.sh = full card pass, run2.sh = bottom-half 2.5x upscale pass for misses, parse.py = map MIDFIELDER/DEFENDER/... to GK/DEF/MID/FWD/COACH. Overrides are applied only with confidence >= 70.

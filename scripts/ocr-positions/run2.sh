id=$(basename $1 .jpg)
convert $1 -resize 1200x1200 -gravity south -crop 100%x50%+0+0 +repage -resize 250% -colorspace Gray -normalize /tmp/h$id.png 2>/dev/null
OMP_THREAD_LIMIT=1 tesseract /tmp/h$id.png tsv2/$id -l eng --psm 11 tsv >/dev/null 2>&1
rm -f /tmp/h$id.png

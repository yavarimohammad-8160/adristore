id=$(basename $1 .jpg)
convert $1 -resize 1600x1600 -colorspace Gray -normalize /tmp/g$id.png 2>/dev/null
OMP_THREAD_LIMIT=1 tesseract /tmp/g$id.png tsv/$id -l eng --psm 11 tsv >/dev/null 2>&1
rm -f /tmp/g$id.png

#!/bin/bash

echo -e "\033[0;32mBuilding GoDoc Recursively...\033[0m"
prefix="github.com/goadesign/"
base=$(pwd)/content/godoc/
fdate=$(date +"%Y-%m-%d")
for OUTPUT in $(go list github.com/goadesign/goa/...)
do
 	pkg=${OUTPUT#$prefix}
	mkdir -p $(dirname ${base}${pkg})
	cd $(dirname ${base}${pkg})
	godoc2md $OUTPUT > $(basename $OUTPUT).md 
cat <<-EOF > $(basename $OUTPUT).md 
$(echo +++)
$(echo title=\"${pkg}\")
$(echo date=\"${fdate}\")
$(echo description=\"godoc for ${pkg}\")
$(echo categories=\[\"godoc\"\])
$(echo tags=\[\"godoc\",\"$(basename $OUTPUT)\"\])
$(echo +++)
$(cat $(basename $OUTPUT).md )
EOF
done
for OUTPUT in $(go list github.com/goadesign/middleware/...)
do
 	pkg=${OUTPUT#$prefix}
	mkdir -p $(dirname ${base}${pkg})
	cd $(dirname ${base}${pkg})
	godoc2md $OUTPUT > $(basename $OUTPUT).md 
cat <<-EOF > $(basename $OUTPUT).md 
$(echo +++)
$(echo title=\"${pkg}\")
$(echo date=\"${fdate}\")
$(echo description=\"godoc for ${pkg}\")
$(echo categories=\[\"godoc\"\])
$(echo tags=\[\"godoc\",\"$(basename $OUTPUT)\"\])
$(echo +++)
$(cat $(basename $OUTPUT).md )
EOF
done
for OUTPUT in $(go list github.com/goadesign/gorma/...)
do
 	pkg=${OUTPUT#$prefix}
	mkdir -p $(dirname ${base}${pkg})
	cd $(dirname ${base}${pkg})
	godoc2md $OUTPUT > $(basename $OUTPUT).md 
cat <<-EOF > $(basename $OUTPUT).md 
$(echo +++)
$(echo date=\"${fdate}\")
$(echo title=\"${pkg}\")
$(echo description=\"godoc for ${pkg}\")
$(echo categories=\[\"godoc\"\])
$(echo tags=\[\"godoc\",\"$(basename $OUTPUT)\"\])
$(echo +++)
$(cat $(basename $OUTPUT).md )
EOF
done
for OUTPUT in $(go list github.com/goadesign/encoding/...)
do
 	pkg=${OUTPUT#$prefix}
	mkdir -p $(dirname ${base}${pkg})
	cd $(dirname ${base}${pkg})
	godoc2md $OUTPUT > $(basename $OUTPUT).md 
cat <<-EOF > $(basename $OUTPUT).md 
$(echo +++)
$(echo date=\"${fdate}\")
$(echo title=\"${pkg}\")
$(echo description=\"godoc for ${pkg}\")
$(echo categories=\[\"godoc\"\])
$(echo tags=\[\"godoc\",\"$(basename $OUTPUT)\"\])
$(echo +++)
$(cat $(basename $OUTPUT).md )
EOF
done


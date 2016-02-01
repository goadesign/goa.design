#!/bin/bash

echo -e "\033[0;32mBuilding GoDoc Recursively...\033[0m"
prefix="github.com/goadesign/"
base=$(pwd)/content/godoc/
for OUTPUT in $(go list github.com/goadesign/goa/...)
do
 	pkg=${OUTPUT#$prefix}
	mkdir -p ${base}${pkg}
	cd ${base}${pkg}
	godoc2md $OUTPUT > $(basename $OUTPUT).md 
done



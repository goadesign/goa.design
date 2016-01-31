#!/bin/bash

echo -e "\033[0;32mBuilding Site In Docker...\033[0m"

docker run --rm -v `pwd`:/website bketelsen/goaweb


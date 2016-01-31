FROM    ubuntu:14.04

RUN     apt-get update
RUN     apt-get install -y nodejs npm git git-core wget
RUN     ln -s /usr/bin/nodejs /usr/bin/node
RUN     wget https://github.com/spf13/hugo/releases/download/v0.15/hugo_0.15_linux_amd64.tar.gz
RUN     tar zxvf hugo_0.15_linux_amd64.tar.gz
RUN     mv hugo_0.15_linux_amd64/hugo_0.15_linux_amd64 /usr/local/bin/hugo && rm -rf hugo_0.15_linux_amd64

# Install Bower & Grunt
RUN npm install -g grunt-cli grunt 
RUN npm install --save-dev grunt-cli grunt string toml

ADD . /website/
# Define working directory.
WORKDIR /website

# Define default command.
CMD ["make"]

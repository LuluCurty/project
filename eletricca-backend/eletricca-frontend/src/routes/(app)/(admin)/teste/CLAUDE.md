# Testing route

## Main reason
Using versity will give us the flexibility of using our own filesystem and one disc for now
While maintaining the APACHE2  liscence

## Future
We plan to integrate both the S3 and posix in a ecosystem where users will be able to change 
files directly while they will appear on versity gateway or on the intranet
This will make for a good intranet for corps to use for free

## Versity configuration file

VGW_BACKEND=posix
VGW_BACKEND_ARG=/home/eletricca/Desktop/gw-root
ROOT_ACCESS_KEY_ID=eletricca
ROOT_SECRET_ACCESS_KEY=eletrO@8002
VGW_PORT=:17017
VGW_WEBUI_PORT=:17018
VGW_WEBUI_NO_TLS=true
VGW_CORS_ALLOW_ORIGIN=*
VGW_IAM_DIR=/home/eletricca/Desktop/gw-iam
VGW_VERSIONING_DIR=/home/eletricca/Desktop/gw-vers
VGW_CHOWN_UID=true
VGW_CHOWN_GID=true

### IAM
This is important, as I plan to make a multitenant aplication for 2 different companies
So with IAM set I can make multiple users or multiple setups (still deciding)

### Versioning
We will use versioning

### TLS
No TLS for now as it is inside my local network so it will not need TLS for now

Android Release
---------------

To build a new Android release you will need the signing key (ask someone for it) and then you'll need to make a `keystore.properties` file in the android directory. This file needs to look like:

`parity-server/android/keystore.properties`:
```
keyPassword=
storePassword=
```

Then choose Build -> Generate Signed Bundle/APK. Note the destination directory in the last step

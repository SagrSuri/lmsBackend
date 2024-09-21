## Documentation
 
Installing -
```bash
   npm i express dotenv cloudinary jsonwebtoken mongoose multer nodemailer nodemon bcryptjs cookie-parser cors --save
```
```javascript
   npm i morgan //this is library for logged tracking
```

```info
    Multer converting binary data to image
```

- We are Using Crypto for Forgot the password., this sending the token to the user for reseting the password.

```bash
    npm install nodemailer
```
- For Sending Email to user. Useing 'Nodemailer.com' with testing Mailtrap. only for development


#### For Email send we are using gmail api credential // FAILD Implimentation.
```bash
  npm install googleapis nodemailer express # ignore which already you installed
```


### We are also adding email verification
- When user register he got email with token he need to visit there, in testing we are using postman , we are going to recive email and copy token from there and test using postman - like - GET - http://localhost:8081/api/v1/user/verify-email/ee3cdb0699f47be8524606d5d27509594fa8337d
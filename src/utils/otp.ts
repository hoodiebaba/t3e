// File: src/utils/otp.ts

export function generateOTP(length: number = 6): string {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10); // 0-9 random digit
  }
  return otp;
}

const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
const n = ["  const handleSendOTP = async (e) => {","    e.preventDefault(); if (phoneNumber.length < 8) return;","    setLoginLoading(true); setOtpError('');","    try { const result = await sendOTP(phoneNumber, 'recaptcha-container'); setConfirmationResult(result); setOtpSent(true); }","    catch (err) { setOtpError(err.message || 'Failed to send OTP.'); }","    finally { setLoginLoading(false); }","  };","  const handleVerifyOTP = async (e) => {","    e.preventDefault(); if (!confirmationResult || otp.length < 4) return;","    setLoginLoading(true); setOtpError('');","    try { const user = await verifyOTP(confirmationResult, otp); const profile = await getUserProfile(user.uid); setUserId(user.uid); setUserProfile(profile); setOnline(user.uid); setupSignalListener(user.uid); }","    catch (err) { setOtpError('Invalid OTP. Please try again.'); }","    finally { setLoginLoading(false); }","  };"];
const r = [...lines.slice(0,318), ...n, ...lines.slice(337)];
fs.writeFileSync('src/App.tsx', r.join('\n'), 'utf8');
console.log('Done', r.length);

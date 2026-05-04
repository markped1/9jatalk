const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const newUI = [
  "          <h1 className=\"text-2xl font-bold text-gray-800 mb-2\">Welcome to 9jaTalk</h1>",
  "          <p className=\"text-gray-500 mb-6\">{otpSent ? 'Enter the OTP sent to ' + phoneNumber : 'Enter your phone number to get started'}</p>",
  "          <div id=\"recaptcha-container\"></div>",
  "          {!otpSent ? (",
  "            <form onSubmit={handleSendOTP} className=\"space-y-4\">",
  "              <input type=\"tel\" placeholder=\"+234 801 234 5678\" className=\"w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] transition-all text-lg\" value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)}/>",
  "              {otpError && <p className=\"text-red-500 text-sm\">{otpError}</p>}",
  "              <button type=\"submit\" disabled={loginLoading} className=\"w-full bg-[#008751] text-white font-bold py-3 rounded-xl hover:bg-[#006b40] transition-colors shadow-lg disabled:opacity-60\">",
  "                {loginLoading ? 'Sending OTP...' : 'Send OTP'}",
  "              </button>",
  "            </form>",
  "          ) : (",
  "            <form onSubmit={handleVerifyOTP} className=\"space-y-4\">",
  "              <div className=\"flex gap-2 justify-center\">",
  "                <input type=\"text\" inputMode=\"numeric\" maxLength={6} placeholder=\"Enter 6-digit OTP\" className=\"w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751] text-center text-2xl font-bold tracking-widest\" value={otp} onChange={e=>setOtp(e.target.value.replace(/\\D/g,''))}/>",
  "              </div>",
  "              {otpError && <p className=\"text-red-500 text-sm\">{otpError}</p>}",
  "              <button type=\"submit\" disabled={loginLoading} className=\"w-full bg-[#008751] text-white font-bold py-3 rounded-xl hover:bg-[#006b40] transition-colors shadow-lg disabled:opacity-60\">",
  "                {loginLoading ? 'Verifying...' : 'Verify OTP'}",
  "              </button>",
  "              <button type=\"button\" onClick={()=>{setOtpSent(false);setOtp('');setOtpError('');}} className=\"w-full text-gray-500 text-sm py-2 hover:text-gray-700\">",
  "                Change number",
  "              </button>",
  "            </form>",
  "          )}",
  "          <p className=\"mt-6 text-xs text-gray-400\">By continuing, you agree to our Terms of Service and Privacy Policy.</p>",
  "          <p className=\"mt-4 text-[10px] text-gray-300\">Designed by Thompson Obosa</p>"
];

// Replace lines 605-624 (0-indexed)
const before = lines.slice(0, 605);
const after = lines.slice(625);
const result = [...before, ...newUI, ...after];
fs.writeFileSync('src/App.tsx', result.join('\n'), 'utf8');
console.log('Done. Lines:', result.length);

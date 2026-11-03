const $ = id => document.getElementById(id);
let verifier, auth, firebaseApp, modules, sentPhone, proof, busy = false, resendAt = 0;

function show(message, kind = '', details = '') {
  $('status').textContent = message;
  $('status').dataset.kind = kind;
  $('result').textContent = details;
}

function updateButtons() {
  if (proof && Date.now() >= proof.expires) { proof = null; sentPhone = null; }
  const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
  $('connect').disabled = busy;
  $('send').disabled = busy || !verifier || seconds > 0;
  $('send').textContent = seconds ? `Gửi lại sau ${seconds}s` : 'Gửi OTP qua backend';
  $('phone').disabled = busy;
  $('email').disabled = busy;
  $('verify').disabled = busy || !sentPhone || !!proof;
  $('partner-fields').disabled = busy || !proof;
  $('otp').disabled = busy;
  $('form-gate').textContent = proof
    ? `Điện thoại đã xác thực. Có thể gửi hồ sơ trong ${Math.ceil((proof.expires - Date.now()) / 1000)} giây.`
    : 'Xác thực OTP điện thoại trước khi gửi hồ sơ.';
}

$('phone').addEventListener('input', () => { sentPhone = null; proof = null; $('otp').value = ''; updateButtons(); });
setInterval(updateButtons, 1000);

async function createCaptcha() {
  verifier?.clear();
  verifier = new modules.auth.RecaptchaVerifier(auth, 'captcha', { size: 'normal' });
  await verifier.render();
}

async function callApi(path, body, json = false) {
  const response = await fetch(path, {
    method: 'POST',
    headers: body instanceof FormData ? {} : { 'Content-Type': json ? 'application/json' : 'application/x-www-form-urlencoded' },
    body: body instanceof FormData ? body : json ? JSON.stringify(body) : new URLSearchParams(body),
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`HTTP ${response.status}: API không trả JSON. Kiểm tra backend đang chạy với profile dev/test.`);
  }
  const data = await response.json();
  show(data.message || `HTTP ${response.status}`, response.ok && data.isSuccess ? 'success' : 'error',
    `POST ${path}\nHTTP ${response.status}\n${JSON.stringify(data, null, 2)}`);
  return response.ok && data.isSuccess ? (data.data ?? true) : false;
}

$('config-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  busy = true;
  updateButtons();
  sentPhone = null;
  proof = null;
  show('Đang khởi tạo Firebase…');
  try {
    const config = JSON.parse($('config').value);
    if (!config.apiKey || !config.authDomain || !config.projectId) {
      throw new Error('Config cần apiKey, authDomain và projectId.');
    }
    modules ||= {
      app: await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      auth: await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
    };
    verifier?.clear();
    verifier = null;
    if (firebaseApp) await modules.app.deleteApp(firebaseApp);
    firebaseApp = modules.app.initializeApp(config, 'scamshield-otp-test');
    auth = modules.auth.getAuth(firebaseApp);
    await createCaptcha();
    show('Firebase sẵn sàng', 'success', 'Nhập số điện thoại, hoàn thành reCAPTCHA rồi nhấn Gửi OTP.');
  } catch (error) {
    verifier?.clear();
    verifier = null;
    show('Không khởi tạo được Firebase', 'error', error.message);
  } finally {
    busy = false;
    updateButtons();
  }
});

$('send-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !verifier || Date.now() < resendAt) return;
  sentPhone = null;
  proof = null;
  busy = true;
  updateButtons();
  show('Đang lấy reCAPTCHA token…');
  try {
    const phoneNumber = $('phone').value.trim();
    const recaptchaToken = await verifier.verify();
    show('Đang yêu cầu backend gửi OTP…');
    if (await callApi('/api/auth/send-phone-otp', { phoneNumber, recaptchaToken })) {
      sentPhone = phoneNumber;
      $('otp').value = '';
      $('otp').focus();
      resendAt = Date.now() + 60_000;
    }
  } catch (error) {
    show('Không gửi được OTP', 'error', error.message);
  } finally {
    // Token reCAPTCHA chỉ dùng một lần; tạo widget mới cho lần gửi tiếp theo.
    try { await createCaptcha(); }
    catch (error) {
      verifier?.clear();
      verifier = null;
      show('Cần khởi tạo lại reCAPTCHA', 'error', error.message);
    }
    busy = false;
    updateButtons();
  }
});

$('verify-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !sentPhone || proof) return;
  busy = true;
  updateButtons();
  try {
    const result = await callApi('/api/auth/verify-contacts', {
      phoneNumber: sentPhone, phoneOtp: $('otp').value.trim(),
    }, true);
    if (result) proof = {
      token: result.verificationToken, phone: sentPhone,
      expires: Date.parse(result.expiresAt + '+07:00'),
    };
  } catch (error) { show('Không xác thực được OTP điện thoại', 'error', error.message); }
  finally { busy = false; updateButtons(); }
});

$('partner-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !proof || Date.now() >= proof.expires) { updateButtons(); return; }
  if (!$('email').reportValidity()) return;
  busy = true;
  updateButtons();
  const split = id => $(id).value.split(',').map(value => value.trim()).filter(Boolean);
  const request = {
    legalName: $('legal-name').value.trim(), taxCode: $('tax-code').value.trim(),
    corporateEmail: $('email').value.trim(), contactPhone: proof.phone, verificationToken: proof.token,
    password: $('password').value, representativeNameAndTitle: $('representative').value.trim(),
    officialDomains: split('domains'), officialHotlines: split('hotlines'), smsBrandNames: split('brands'),
    agreeTerms: $('terms').checked,
  };
  const body = new FormData();
  body.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
  for (const [id, part] of [['licenses', 'businessLicenseFiles'], ['ownership', 'ownershipProofFiles'], ['authorization', 'authorizationFiles']]) {
    for (const file of $(id).files) body.append(part, file);
  }
  try {
    if (await callApi('/api/partners/registrations', body)) {
      $('form-gate').textContent = 'Hồ sơ đã gửi thành công, đang chờ duyệt.';
      $('password').value = '';
      sentPhone = null;
      proof = null;
    }
  } catch (error) { show('Không gửi được hồ sơ', 'error', error.message); }
  finally { busy = false; updateButtons(); }
});

updateButtons();

if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
  $('domain-note').append(' Bạn đang ở localhost: dùng domain HTTPS được Firebase cho phép để thử luồng SMS thật.');
}

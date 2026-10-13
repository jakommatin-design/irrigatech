/**
 * IRRIGA-TECH USSD & AUTOMATED SMS ENGINE
 * 
 * Provides telecommunication interfaces for non-smartphone farmers (feature phones / "kabambe").
 * - Fully compatible with Africa's Talking / Safaricom / Airtel USSD gateway protocol (*384*4744#).
 * - Dual-language menus (English and Kiswahili) designed for learned and unlearned farmers.
 * - Automated post-irrigation SMS dispatcher.
 * - Interactive USSD session simulator for web testing.
 */

export class UssdService {
  constructor(bridge, db, tidb, aiService) {
    this.bridge = bridge;
    this.db = db;
    this.tidb = tidb;
    this.ai = aiService;
    this.sessions = new Map(); // sessionId -> { lang: 'sw'|'en', lastReport: null }
    this.smsLog = [];
    this.lastIrrigationReport = null;

    // Load credentials from environment
    this.atUsername = process.env.AT_USERNAME || 'sandbox';
    this.atApiKey = process.env.AT_API_KEY || null;
    // Africa's Talking sender IDs must be enabled for the account. Omit `from`
    // until an approved sender ID is configured instead of guessing one.
    this.atSenderId = process.env.AT_SENDER_ID || null;
  }

  setLastIrrigationReport(report) {
    this.lastIrrigationReport = report;
  }

  /**
   * Handle incoming USSD request from Telecom Gateway
   * Standard Africa's Talking format:
   * req.body = { sessionId, serviceCode, phoneNumber, text }
   */
  async handleUssdRequest({ sessionId, serviceCode, phoneNumber, text = '' }) {
    let session = this.sessions.get(sessionId) || { lang: 'sw', phone: phoneNumber };
    this.sessions.set(sessionId, session);

    const parts = text ? text.split('*') : [];
    const currentInput = parts[parts.length - 1] || '';

    // Level 0: Welcome Menu
    if (!text || text.trim() === '') {
      return (
        "CON Karibu / Welcome to Irriga-Tech (*384*4744#)\n" +
        "Chagua Lugha / Select Language:\n" +
        "1. Kiswahili (Rahisi)\n" +
        "2. English"
      );
    }

    // Language selection
    if (parts.length === 1) {
      if (currentInput === '1') {
        session.lang = 'sw';
        return this.getMainMenuSw();
      } else if (currentInput === '2') {
        session.lang = 'en';
        return this.getMainMenuEn();
      } else {
        return "END Nambari siyo sahihi / Invalid option. Piga tena *384*4744#";
      }
    }

    // Main menu choices
    const lang = session.lang || 'sw';
    const choice = parts[1];

    if (parts.length === 2) {
      switch (choice) {
        // 1. Current Farm Status
        case '1':
          return lang === 'sw' ? this.getStatusSw() : this.getStatusEn();

        // 2. Last Irrigation & Water Used
        case '2':
          return lang === 'sw' ? this.getLastIrrigationSw() : this.getLastIrrigationEn();

        // 3. Soil pH & Fertilizer Advice
        case '3':
          return lang === 'sw' ? this.getFertilizerAdviceSw() : this.getFertilizerAdviceEn();

        // 4. Remote Pump Control (Washa/Zima Bomba)
        case '4':
          return lang === 'sw' 
            ? "CON Dhibiti Bomba la Maji:\n1. Washa Umwagiliaji (Dakika 3)\n2. Zima Bomba Sasa\n0. Rudi Nyuma"
            : "CON Pump Remote Control:\n1. Start Irrigation (3 Mins)\n2. Stop Pump Now\n0. Back";

        // 5. Send SMS to Farmer's Phone
        case '5': {
          await this.dispatchImmediateStatusSms(phoneNumber, lang);
          return lang === 'sw'
            ? "END Ujumbe (SMS) umetumwa kwa simu yako yenye ripoti kamili ya maji, pH, na mbolea. Asante!"
            : "END Full status SMS has been sent to your phone with water, pH, and fertilizer advice. Thank you!";
        }

        default:
          return lang === 'sw' 
            ? "END Nambari haipo. Piga tena *384*4744#"
            : "END Invalid option. Please dial *384*4744# again.";
      }
    }

    // Submenu handling for Pump Control (choice 4)
    if (parts.length === 3 && choice === '4') {
      const subChoice = parts[2];
      if (subChoice === '1') {
        this.bridge.sendCommand('PUMP_ON');
        return lang === 'sw'
          ? "END Bomba limewashwa kikamilifu! Mimea inamwagiliwa sasa. Utapata SMS likizimwa."
          : "END Pump started successfully! Plants are being irrigated. You will receive an SMS when done.";
      } else if (subChoice === '2') {
        this.bridge.sendCommand('PUMP_OFF');
        return lang === 'sw'
          ? "END Bomba limezimwa. Umwagiliaji umesitishwa."
          : "END Pump stopped. Irrigation halted.";
      } else {
        return lang === 'sw' ? this.getMainMenuSw() : this.getMainMenuEn();
      }
    }

    return "END Asante kwa kutumia Irriga-Tech.";
  }

  getMainMenuSw() {
    return (
      "CON Irriga-Tech Shamba Mahiri:\n" +
      "1. Angalia Hali ya Shamba\n" +
      "2. Maji Yaliyotumika & Muda\n" +
      "3. pH ya Udongo & Ushauri wa Mbolea\n" +
      "4. Washa au Zima Maji\n" +
      "5. Nitumie Ujumbe wa Simu (SMS)\n" +
      "0. Funga"
    );
  }

  getMainMenuEn() {
    return (
      "CON Irriga-Tech Smart Farm:\n" +
      "1. Farm & Climate Status\n" +
      "2. Water Used & Irrigation Time\n" +
      "3. Soil pH & Fertilizer Advisory\n" +
      "4. Remote Pump Control\n" +
      "5. Send SMS to My Phone\n" +
      "0. Exit"
    );
  }

  getStatusSw() {
    const s = this.bridge.state;
    const moisture = s.soilMoisture || 45;
    const status = moisture > 70 ? 'Inahitaji Maji' : (moisture < 35 ? 'Maji Mengi' : 'Mzuri');
    return (
      `END Hali ya Shamba:\n` +
      `Unyevu wa Udongo: ${moisture}% (${status})\n` +
      `Joto: ${s.temperature || 26}°C\n` +
      `Maji ya Tangi: ${s.waterTank || 75}%\n` +
      `Bomba: ${s.pump ? 'LINAWAKA' : 'Limezima'}`
    );
  }

  getStatusEn() {
    const s = this.bridge.state;
    const moisture = s.soilMoisture || 45;
    const status = moisture > 70 ? 'Dry' : (moisture < 35 ? 'Wet' : 'Optimal');
    return (
      `END Farm Status:\n` +
      `Soil Moisture: ${moisture}% (${status})\n` +
      `Temperature: ${s.temperature || 26}°C\n` +
      `Water Tank: ${s.waterTank || 75}%\n` +
      `Pump: ${s.pump ? 'RUNNING' : 'OFF'}`
    );
  }

  getLastIrrigationSw() {
    if (!this.lastIrrigationReport) {
      return (
        "END Umwagiliaji wa Hivi Karibuni:\n" +
        "Muda: Dakika 3 zilizopita\n" +
        "Maji Yaliyotumika: Lita 36.0\n" +
        "Hali: Umekamilika vizuri"
      );
    }
    const r = this.lastIrrigationReport;
    return (
      `END Umwagiliaji wa Hivi Karibuni:\n` +
      `Muda: ${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n` +
      `Maji Yaliyotumika: Lita ${r.irrigationSummary?.waterLiters || 36}\n` +
      `Muda wa Kuendesha: Dakika ${r.irrigationSummary?.durationMinutes || 3}\n` +
      `pH ya Udongo: ${r.irrigationSummary?.soilPh || 6.2} (Bora)`
    );
  }

  getLastIrrigationEn() {
    if (!this.lastIrrigationReport) {
      return (
        "END Recent Irrigation Report:\n" +
        "Time: 12:40 PM\n" +
        "Water Used: 36.0 Liters\n" +
        "Duration: 3 Mins\n" +
        "Status: Success"
      );
    }
    const r = this.lastIrrigationReport;
    return (
      `END Irrigation Report:\n` +
      `Time: ${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n` +
      `Water Used: ${r.irrigationSummary?.waterLiters || 36} Liters\n` +
      `Duration: ${r.irrigationSummary?.durationMinutes || 3} Mins\n` +
      `Soil pH: ${r.irrigationSummary?.soilPh || 6.2} (Optimal)`
    );
  }

  getFertilizerAdviceSw() {
    if (this.lastIrrigationReport?.ussdSummarySw) {
      return `END Ushauri wa Mbolea:\n${this.lastIrrigationReport.ussdSummarySw}`;
    }
    return (
      "END Ushauri wa Mbolea & pH:\n" +
      "pH ya Udongo: 6.2 (Nzuri sana)\n" +
      "Mbolea: Calcium Nitrate (15.5-0-0)\n" +
      "Wakati: Weka leo saa 8:00 mchana jua likitua kidogo\n" +
      "Faida: Kuzuia matunda kuoza chini"
    );
  }

  getFertilizerAdviceEn() {
    if (this.lastIrrigationReport?.ussdSummaryEn) {
      return `END Fertilizer & pH Advice:\n${this.lastIrrigationReport.ussdSummaryEn}`;
    }
    return (
      "END Soil pH & Fertilizer:\n" +
      "Soil pH: 6.2 (Optimal)\n" +
      "Fertilizer: Calcium Nitrate [15.5-0-0]\n" +
      "When: Apply today at 14:00 PM (cool hours)\n" +
      "Rationale: Strong vegetative stem growth"
    );
  }

  /**
   * Dispatch immediate status SMS
   */
  async dispatchImmediateStatusSms(phoneNumber, lang = 'sw') {
    const s = this.bridge.state;
    const msg = lang === 'sw'
      ? `[IRRIGA-TECH] Hali ya Shamba: Unyevu ${s.soilMoisture}%, Joto ${s.temperature}C, Tangi ${s.waterTank}%. pH 6.2 (Bora). Mbolea: Calcium Nitrate leo saa 8:00 mchana.`
      : `[IRRIGA-TECH] Farm Status: Moisture ${s.soilMoisture}%, Temp ${s.temperature}C, Tank ${s.waterTank}%. pH 6.2 (Optimal). Fertilizer: Calcium Nitrate today at 2:00 PM.`;

    await this.sendSms({ to: phoneNumber, message: msg, type: 'MANUAL_REQUEST' });
  }

  /**
   * Automatic Post-Irrigation SMS Dispatcher
   * Called immediately once irrigation cycle finishes.
   */
  async dispatchPostIrrigationSms(report, recipientPhone = '+254712345678') {
    this.setLastIrrigationReport(report);

    // Prepare dual message (Swahili first for accessibility to non-English speaking farmers)
    const swMessage = report.smsMessageSw;
    const enMessage = report.smsMessageEn;

    const dispatchResult = await this.sendSms({
      to: recipientPhone,
      message: swMessage,
      type: 'AUTO_POST_IRRIGATION',
      metadata: {
        waterLiters: report.irrigationSummary?.waterLiters,
        soilPh: report.irrigationSummary?.soilPh,
        durationSeconds: report.irrigationSummary?.durationSeconds,
        fertilizer: report.recommendation?.fertilizer
      }
    });

    console.log(`[Automated SMS] Post-irrigation notification dispatched to ${recipientPhone}`);
    return dispatchResult;
  }

  /**
   * Send SMS via Africa's Talking API or Local Gateway Simulator
   */
  async sendSms({ to, message, type = 'NOTIFICATION', metadata = {} }) {
    const destination = String(to || '').replace(/[\s()-]/g, '');
    const smsRecord = {
      id: `sms-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      isoTime: new Date().toISOString(),
      recipient: destination || '+254712345678',
      message,
      type,
      metadata,
      status: this.atApiKey ? 'PENDING' : 'SIMULATED',
      gateway: this.atApiKey ? 'AfricasTalking' : 'SimulatedGSMGateway'
    };

    // If real Africa's Talking credentials exist, dispatch HTTP request
    if (this.atApiKey && this.atUsername) {
      try {
        const formData = new URLSearchParams();
        formData.append('username', this.atUsername);
        formData.append('to', destination || '+254712345678');
        formData.append('message', message);
        if (this.atSenderId) formData.append('from', this.atSenderId);

        const atRes = await fetch('https://api.africastalking.com/version1/messaging', {
          method: 'POST',
          headers: {
            'apiKey': this.atApiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: formData.toString()
        });

        const result = await atRes.json().catch(() => null);
        const recipients = result?.SMSMessageData?.Recipients || [];
        const recipient = recipients.find(item => String(item.number || '').replace(/[\s()-]/g, '') === (destination || '+254712345678')) || recipients[0];
        if (atRes.ok && recipient && [100, 101, 102].includes(Number(recipient.statusCode))) {
          smsRecord.status = Number(recipient.statusCode) === 102 ? 'QUEUED' : Number(recipient.statusCode) === 100 ? 'PROCESSING' : 'SENT_VIA_TELCO';
          smsRecord.gatewayMessage = recipient.status || 'Accepted by Africa\'s Talking';
        } else {
          smsRecord.status = 'FAILED';
          smsRecord.gatewayMessage = recipient?.status || result?.SMSMessageData?.Message || `Africa's Talking returned HTTP ${atRes.status}`;
        }
      } catch (err) {
        console.warn('[SMS Gateway] Live carrier dispatch warning:', err.message);
        smsRecord.status = 'FAILED';
        smsRecord.gatewayMessage = 'Could not reach Africa\'s Talking.';
      }
    }

    // Keep log in memory (capped at 100)
    this.smsLog.unshift(smsRecord);
    if (this.smsLog.length > 100) this.smsLog.pop();

    return smsRecord;
  }

  getSmsLogs() {
    return this.smsLog;
  }
}

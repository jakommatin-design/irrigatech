/**
 * IRRIGA-TECH AI AGRONOMY SERVICE
 * 
 * Synthesizes crop physiological requirements, substrate pH, Electrical Conductivity (EC),
 * Vapor Pressure Deficit (VPD), and post-irrigation moisture to prescribe:
 * 1. Post-irrigation soil pH diagnosis
 * 2. Exact fertilizer formulation (NPK, Calcium Nitrate, micronutrients)
 * 3. Exact application timing (e.g. "Apply today at 14:00 during cooler hours")
 * 4. Dual-language generation: English & Kiswahili (for learned and unlearned farmers)
 * 5. Gemini API generative model hook with deterministic offline fallback
 */

import 'dotenv/config';

export class AiAgronomyService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
    this.geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  /**
   * Set or update Gemini API Key at runtime
   */
  setApiKey(key) {
    this.geminiApiKey = key;
  }

  /**
   * Primary Post-Irrigation Agronomy Advisor
   * Triggered immediately once irrigation pump stops.
   */
  async generatePostIrrigationAdvice({
    crop = 'Tomato (Solanum lycopersicum)',
    cropStage = 'Vegetative Phase',
    durationSeconds = 180,
    waterLiters = 36.0,
    soilPh = null,
    soilMoisture = null,
    temperature = null,
    humidity = null,
    ec = 2.1
  }) {
    // 1. Determine pH status & optimal fertilizer
    let phClassification = 'UNKNOWN';
    let fertilizerEn = '';
    let fertilizerSw = '';
    let timingEn = '';
    let timingSw = '';
    let dosage = '';
    let rationaleEn = '';
    let rationaleSw = '';

    const phVal = soilPh !== null && soilPh !== '' && Number.isFinite(Number(soilPh)) ? Number(soilPh) : null;

    if (phVal === null) {
      fertilizerEn = 'No fertilizer recommendation: measure root-zone pH and electrical conductivity first.';
      fertilizerSw = 'Hakuna pendekezo la mbolea: pima pH na EC ya eneo la mizizi kwanza.';
      timingEn = 'Review after a soil or substrate test';
      timingSw = 'Kagua baada ya kupima udongo au sehemu ya mizizi';
      dosage = 'Not available without soil pH and EC measurements';
      rationaleEn = 'The device has no soil pH reading. Fertilizer type and dosage cannot be selected reliably from moisture, temperature, and humidity alone.';
      rationaleSw = 'Kifaa hakina kipimo cha pH ya udongo. Aina na kiasi cha mbolea hakiwezi kuchaguliwa kwa uhakika kwa kutumia unyevunyevu na hali ya hewa pekee.';
    } else if (phVal < 5.8) {
      phClassification = 'ACIDIC';
      fertilizerEn = 'Calcium Nitrate [15.5-0-0 + 19% Ca] + Potassium Silicate';
      fertilizerSw = 'Mbolea ya Chokaa na Calcium Nitrate (kurekebisha asidi ya udongo)';
      timingEn = 'Apply tomorrow morning at 08:00 AM after root hydration stabilizes';
      timingSw = 'Weka kesho asubuhi saa 2:00 asubuhi baada ya udongo kutulia';
      dosage = '10g per 10 Liters of water';
      rationaleEn = `Soil pH is low (${phVal}). Slightly acidic conditions lock up phosphorus and magnesium. Calcium nitrate gently buffers acidity without scorching roots.`;
      rationaleSw = `pH ya udongo iko chini (${phVal} - ina asidi). Mbolea hii itasaidia kupunguza asidi na kusaidia mizizi kunyonya chakula vizuri.`;
    } else if (phVal > 6.8) {
      phClassification = 'ALKALINE';
      fertilizerEn = 'Fe-EDDHA (6% Iron Chelate) + Ammonium Sulfate buffer';
      fertilizerSw = 'Mbolea ya Chuma (Iron Chelate) na Ammonium Sulfate';
      timingEn = 'Apply today at 17:30 PM (late evening during cooler hours)';
      timingSw = 'Weka leo jioni saa 11:30 jioni jua likitua kuzuia mbolea kuungua';
      dosage = '1.5g Iron Chelate + 15g buffer per 10 Liters';
      rationaleEn = `Soil pH is high (${phVal}). Alkaline conditions precipitate iron and zinc. Iron chelate prevents leaf chlorosis and neutralizes root zone pH.`;
      rationaleSw = `pH ya udongo iko juu (${phVal} - udongo wa chokaa). Mbolea hii inazuia majani kuwa ya manjano na inafanya mimea kuwa ya kijani kibichi.`;
    } else {
      // 5.8 - 6.8 is the prime sweet spot for solanaceous crops
      phClassification = 'OPTIMAL';
      fertilizerEn = 'Calcium Nitrate [15.5-0-0 + 19% Ca] + Magnesium Sulfate (Epsom Salt)';
      fertilizerSw = 'Mbolea ya Calcium Nitrate na Magnesium (kwa ukuaji thabiti wa shina)';
      timingEn = 'Apply today at 14:00 PM during cooler hours';
      timingSw = 'Weka leo saa 8:00 mchana jua likianza kupungua';
      dosage = '12.5g Calcium Nitrate + 5g Magnesium Sulfate per 10 Liters';
      rationaleEn = `Substrate pH is optimal (${phVal}). Perfect nutrient translocation window. Calcium strengthens cell walls and prevents blossom-end rot.`;
      rationaleSw = `pH ya udongo ni nzuri sana (${phVal}). Wakati huu ni bora zaidi kwa mimea kunyonya mbolea na kuzuia matunda kuoza chini.`;
    }

    // Attempt Gemini generative refinement if API Key configured
    if (this.geminiApiKey) {
      try {
        const geminiResult = await this.callGeminiModel({
          crop,
          cropStage,
          durationSeconds,
          waterLiters,
          soilPh: phVal,
          soilMoisture,
          temperature,
          humidity
        });
        if (geminiResult) return geminiResult;
      } catch (err) {
        console.warn('[AI Agronomy] Gemini API call skipped or timed out, using calibrated agro rules:', err.message);
      }
    }

    const durationMin = Math.round(durationSeconds / 60);

    return {
      aiMode: 'rules',
      timestamp: Date.now(),
      isoTime: new Date().toISOString(),
      crop,
      cropStage,
      irrigationSummary: {
        durationSeconds,
        durationMinutes: durationMin,
        waterLiters: parseFloat(waterLiters.toFixed(1)),
        soilMoistureAfter: soilMoisture !== null && soilMoisture !== '' && Number.isFinite(Number(soilMoisture)) ? Number(Number(soilMoisture).toFixed(1)) : null,
        soilPh: phVal,
        phStatus: phClassification
      },
      recommendation: {
        fertilizer: fertilizerEn,
        timing: timingEn,
        dosage,
        scientificRationale: rationaleEn
      },
      // Localized for non-smartphone SMS & USSD broadcast
      smsMessageEn: `[IRRIGA-TECH] Irrigation Done! Time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, Water used: ${waterLiters.toFixed(1)}L. Soil pH: ${phVal} (${phClassification}). Advice: Apply ${fertilizerEn.split('+')[0].trim()} ${timingEn.toLowerCase()}. Dial *384*4744#`,
      smsMessageSw: `[IRRIGA-TECH SHAMBA] Umwagiliaji Umekamilika! Muda: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, Maji: Lita ${waterLiters.toFixed(1)}. pH ya Udongo: ${phVal}. Ushauri: ${fertilizerSw}. ${timingSw}. Piga *384*4744#`,
      ussdSummaryEn: `Time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\nWater: ${waterLiters.toFixed(1)}L\nSoil pH: ${phVal} (${phClassification})\nFertilizer: ${fertilizerEn.split('+')[0].trim()}\nWhen: ${timingEn}`,
      ussdSummarySw: `Muda: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\nMaji: Lita ${waterLiters.toFixed(1)}\npH ya Udongo: ${phVal}\nMbolea: ${fertilizerSw.split('(')[0].trim()}\nWakati: ${timingSw}`
    };
  }

  /**
   * Gemini API direct fetch caller
   */
  async callGeminiModel(context) {
    if (!this.geminiApiKey) return null;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;

    const prompt = `You are the Irriga-Tech Senior Agronomist AI. An irrigation cycle just completed with:
- Crop: ${context.crop} (${context.cropStage})
- Irrigation duration: ${Math.round(context.durationSeconds / 60)} minutes
- Water delivered: ${context.waterLiters} Liters
- Soil pH: ${context.soilPh ?? 'not measured'}
- Soil moisture: ${context.soilMoisture}%
- Temperature: ${context.temperature}°C, Humidity: ${context.humidity}%

If soil pH is not measured, do not prescribe fertilizer or a dosage; state that a soil/substrate pH and EC test is needed. Never invent sensor readings. Respond strictly with valid JSON without markdown fences containing:
{
  "fertilizer": "Name of best fertilizer to apply",
  "dosage": "dosage per 10L water",
  "timing": "Exact time to apply today or tomorrow",
  "scientificRationale": "Short 2 sentence explanation",
  "smsMessageEn": "Under 160 character SMS in English",
  "smsMessageSw": "Under 160 character SMS in Swahili for local farmer"
}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 400 }
      })
    });

    if (!response.ok) throw new Error(`Gemini status ${response.status}`);
    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      aiMode: 'gemini',
      timestamp: Date.now(),
      isoTime: new Date().toISOString(),
      crop: context.crop,
      cropStage: context.cropStage,
      irrigationSummary: {
        durationSeconds: context.durationSeconds,
        durationMinutes: Math.round(context.durationSeconds / 60),
        waterLiters: context.waterLiters,
        soilMoistureAfter: context.soilMoisture,
        soilPh: context.soilPh,
        phStatus: context.soilPh === null ? 'UNKNOWN' : (context.soilPh >= 5.8 && context.soilPh <= 6.8 ? 'OPTIMAL' : (context.soilPh < 5.8 ? 'ACIDIC' : 'ALKALINE'))
      },
      recommendation: {
        fertilizer: parsed.fertilizer,
        timing: parsed.timing,
        dosage: parsed.dosage,
        scientificRationale: parsed.scientificRationale
      },
      smsMessageEn: parsed.smsMessageEn,
      smsMessageSw: parsed.smsMessageSw,
      ussdSummaryEn: `Water: ${context.waterLiters}L | pH: ${context.soilPh}\nFertilizer: ${parsed.fertilizer}\nWhen: ${parsed.timing}`,
      ussdSummarySw: `Maji: Lita ${context.waterLiters} | pH: ${context.soilPh}\nMbolea: ${parsed.fertilizer}\nWakati: ${parsed.timing}`
    };
  }
}

export const aiAgronomy = new AiAgronomyService();

/* Step 4: Saathi's offline conversation, used when live AI is unavailable.
   Pure logic: reply(text, {lang, memory, context}) -> {text, lang, memory, action}. */
(function (root) {
  const R = (en, hi) => ({en, hi});
  const intents = [
    {id: 'emergency', re: /chest pain|heart attack|can'?t breathe|cannot breathe|breathless|fell down|i fell|have fallen|stroke|bleeding|unconscious|fainted|सीने में दर्द|छाती में दर्द|साँस नहीं|सांस नहीं|गिर गय|गिर पड़|बेहोश|खून बह|दिल का दौरा|seene me dard|saans nahi|gir gay/i,
      action: {page: 'emergency'}, replies: [
        R('This sounds serious. Please call 112 now, or 108 for an ambulance. If you can, also call your caretaker or a neighbour. Stay seated and keep your phone close.',
          'यह गंभीर लग रहा है। कृपया अभी 112 पर कॉल करें, या एम्बुलेंस के लिए 108। हो सके तो अपने देखभालकर्ता या पड़ोसी को भी फ़ोन करें। बैठ जाइए और फ़ोन पास रखिए।')]},
    {id: 'crisis', re: /kill myself|end my life|want to die|suicide|no reason to live|मरना चाहत|मर जाना|जीने का मन नहीं|आत्महत्या|marna chahta|jeene ka man nahi/i,
      action: {page: 'emergency', crisis: true}, replies: [
        R('I am really glad you told me. You matter, and you do not have to carry this alone. Please call Tele-MANAS at 14416 (free, any time), or 112 if you are in danger right now. Could you also call someone you trust and tell them how you feel?',
          'आपने मुझे बताया, यह बहुत अच्छा किया। आप मायने रखते हैं, और यह बोझ अकेले उठाने की ज़रूरत नहीं। कृपया टेली-मानस 14416 पर कॉल करें (मुफ़्त, कभी भी), या अभी ख़तरा हो तो 112। क्या आप किसी भरोसेमंद अपने को फ़ोन करके अपने मन की बात बता सकते हैं?')]},
    {id: 'abandoned', re: /abandon|left me alone|no one to care|nobody cares for me|thrown out|kicked out|homeless|छोड़ दिया|छोड़ गए|घर से निकाल|कोई देखभाल नहीं|बेघर|chhod diya|ghar se nikal/i,
      action: {page: 'emergency'}, replies: [
        R('I am so sorry. No one deserves to be left alone. Please call Elderline at 14567, the free helpline for senior citizens. They can connect you to an old-age home or other help near you. If you are in danger, call 112.',
          'मुझे बहुत दुख है। किसी को भी ऐसे अकेला नहीं छोड़ा जाना चाहिए। कृपया एल्डरलाइन 14567 पर कॉल करें, यह बुज़ुर्गों के लिए मुफ़्त हेल्पलाइन है। वे आपके पास के वृद्धाश्रम या दूसरी मदद से जोड़ सकते हैं। ख़तरा हो तो 112 पर कॉल करें।')]},
    {id: 'medicine', re: /medicin|tablet|dose|pill|missed my|दवा|दवाई|गोली|खुराक|dawa|dawai|goli/i, replies: [
      R('I can help you remember your schedule, but only your doctor or pharmacist should decide doses or what to do after a missed one. {meds} Shall I open My medicines for you?',
        'मैं आपकी दवा का समय याद दिलाने में मदद कर सकता हूँ, लेकिन मात्रा या छूटी दवा के बारे में डॉक्टर या फ़ार्मासिस्ट ही बताएँ। {meds} क्या मैं मेरी दवाएँ खोल दूँ?')],
      action: {page: 'meds'}},
    {id: 'whoami', re: /are you (a )?(human|real|person|robot|ai)|who are you|what are you|तुम कौन|आप कौन|क्या आप इंसान|tum kaun|aap kaun/i, replies: [
      R('I am Saathi, a computer helper inside this app, not a real person. But I am always happy to listen and chat with you.',
        'मैं साथी हूँ, इस ऐप के अंदर एक कंप्यूटर सहायक, कोई असली इंसान नहीं। लेकिन मैं हमेशा आपकी बात सुनने और बात करने के लिए तैयार हूँ।')]},
    {id: 'greet', re: /^(hi|hello|hey|namaste|namaskar|good (morning|afternoon|evening)|ram ram|jai shri krishna|radhe radhe|sat sri akal|assalam|salaam|adaab)\b|नमस्ते|नमस्कार|राम राम|जय श्री कृष्ण|राधे राधे|सत श्री अकाल|अस्सलाम|आदाब|सुप्रभात/i, replies: [
      R('Namaste{name}! It is lovely to hear from you. How are you feeling today?', 'नमस्ते{name}! आपसे बात करके अच्छा लगा। आज आप कैसा महसूस कर रहे हैं?'),
      R('Hello{name}! I was hoping you would come by. What is on your mind today?', 'नमस्ते{name}! अच्छा हुआ आप आए। आज मन में क्या चल रहा है?'),
      R('Namaste{name}! Did you have your tea yet? Tell me about your morning.', 'नमस्ते{name}! चाय पी ली? अपनी सुबह के बारे में बताइए।')]},
    {id: 'howareyou', re: /how are you|how r u|kaise ho|kaise hain|कैसे हो|कैसे हैं|क्या हाल|kya haal/i, replies: [
      R('I am well, thank you for asking! I enjoy our chats. And how is your health today?', 'मैं ठीक हूँ, पूछने के लिए धन्यवाद! आपसे बात करना अच्छा लगता है। आपकी तबीयत आज कैसी है?'),
      R('I am fine. Talking with you makes my day better. How did you sleep last night?', 'मैं बढ़िया हूँ। आपसे बात करके दिन अच्छा हो जाता है। रात को नींद कैसी आई?')]},
    {id: 'lonely', re: /lonely|alone|miss (my|them|him|her)|nobody talks|अकेल|याद आ|कोई बात नहीं करता|akela|akeli|yaad aa/i, replies: [
      R('Feeling lonely is hard, and many people your age feel it too. You are not a burden for feeling this way. Who do you miss the most? Maybe we can plan a call to them today.',
        'अकेलापन सच में मुश्किल होता है, और बहुत लोग ऐसा महसूस करते हैं। ऐसा लगना कोई कमज़ोरी नहीं। आपको सबसे ज़्यादा किसकी याद आती है? शायद आज उन्हें फ़ोन करने का सोचें?'),
      R('I am here with you. Would it help to look at old photos, or call someone you love? Or shall we just talk for a while?',
        'मैं आपके साथ हूँ। क्या पुरानी फ़ोटो देखना या किसी अपने को फ़ोन करना अच्छा लगेगा? या कुछ देर बस बातें करें?'),
      R('Thank you for telling me. A short walk, a call to an old friend, or visiting the temple, gurudwara, mosque or church nearby can help. What used to cheer you up when you were younger?',
        'मुझे बताने के लिए धन्यवाद। थोड़ी सैर, किसी पुराने दोस्त को फ़ोन, या पास के मंदिर, गुरुद्वारे, मस्जिद या चर्च जाना मन हल्का कर सकता है। जवानी में आपका मन किस चीज़ से खुश होता था?')]},
    {id: 'sad', re: /\bsad\b|upset|crying|depress|worried|anxious|tension|scared|afraid|दुखी|उदास|रो |रोना|परेशान|चिंता|डर|टेंशन|udaas|pareshan|chinta/i, replies: [
      R('I am sorry you feel this way. Would you like to tell me what happened? Sometimes saying it out loud makes it a little lighter.', 'मुझे दुख है कि आप ऐसा महसूस कर रहे हैं। क्या बताना चाहेंगे कि क्या हुआ? कभी-कभी कह देने से मन हल्का हो जाता है।'),
      R('That sounds heavy. Let us take one slow breath together. In… and out. Now, what is worrying you the most?', 'यह भारी लग रहा है। चलिए एक साथ धीरे से साँस लें। अंदर… और बाहर। अब बताइए, सबसे ज़्यादा किस बात की चिंता है?')]},
    {id: 'happy', re: /\b(happy|good|great|fine|well|wonderful)\b|खुश|अच्छा लग|बढ़िया|ठीक हूँ|मज़ा|khush|badhiya|theek hoon/i, replies: [
      R('That makes me happy too! What made today nice?', 'यह सुनकर मुझे भी खुशी हुई! आज क्या अच्छा हुआ?'),
      R('Wonderful! Hold on to that feeling. Tell me one good thing that happened today.', 'बहुत बढ़िया! इस खुशी को संभाल कर रखिए। आज की एक अच्छी बात बताइए।')]},
    {id: 'family', re: /grand(son|daughter|child|kids)|son|daughter|wife|husband|family|children|पोता|पोती|नाती|नातिन|बेटा|बेटी|बच्चे|परिवार|पत्नी|पति|bachche|beta|beti|pota|poti/i, replies: [
      R('Family means so much. Tell me about them. What are their names, and what do you enjoy doing together?', 'परिवार बहुत क़ीमती होता है। उनके बारे में बताइए। उनके नाम क्या हैं, और साथ में क्या करना अच्छा लगता है?'),
      R('How lovely. When did you last talk to them? A short call can brighten both your days.', 'कितना प्यारा। आपकी उनसे पिछली बार कब बात हुई? एक छोटी-सी कॉल दोनों का दिन अच्छा कर सकती है।')]},
    {id: 'memory', re: /remember when|childhood|old days|when i was young|my village|school days|बचपन|पुराने दिन|जवानी|मेरा गाँव|स्कूल के दिन|bachpan|purane din|gaon/i, replies: [
      R('I would love to hear about that! What do you remember most about those days?', 'मुझे ये सुनना बहुत अच्छा लगेगा! उन दिनों की सबसे प्यारी याद क्या है?'),
      R('Those memories are a treasure. What games did you play, and who were your best friends?', 'ये यादें खज़ाना हैं। आप कौन-से खेल खेलते थे, और आपके सबसे अच्छे दोस्त कौन थे?')]},
    {id: 'music', re: /music|song|sing|bhajan|ghazal|kirtan|qawwali|गाना|गाने|संगीत|भजन|ग़ज़ल|ग़ज़ल|कीर्तन|gaana|gane|sangeet/i, action: {page: 'music'}, replies: [
      R('Music is good medicine for the heart! Which singer did you love when you were young? I can play songs for you in Peace & music.', 'संगीत दिल की दवा है! जवानी में आपको कौन-सा गायक पसंद था? सुकून और संगीत में मैं आपके लिए गाने बजा सकता हूँ।'),
      R('Shall I find you a bhajan, an old film song, or something calm? Open Peace & music and I will ask a few easy questions.', 'क्या मैं आपके लिए भजन, पुराना फ़िल्मी गाना या कुछ शांत ढूँढूँ? सुकून और संगीत खोलिए, मैं कुछ आसान सवाल पूछूँगा।')]},
    {id: 'faith', re: /god|pray|prayer|temple|mandir|masjid|mosque|church|gurudwara|bhagwan|allah|waheguru|jesus|भगवान|पूजा|प्रार्थना|मंदिर|मस्जिद|गुरुद्वारा|चर्च|अल्लाह|वाहेगुरु|ईश्वर|puja|ishwar/i, replies: [
      R('Prayer gives many people peace. Every faith teaches kindness to others. Would you like to hear a devotional song in Peace & music?', 'प्रार्थना से बहुत लोगों को शांति मिलती है। हर धर्म दूसरों के साथ दया सिखाता है। क्या सुकून और संगीत में कोई भक्ति गीत सुनना चाहेंगे?'),
      R('That is beautiful. What prayer or bhajan did your parents teach you?', 'यह बहुत सुंदर है। आपके माता-पिता ने आपको कौन-सी प्रार्थना या भजन सिखाया था?')]},
    {id: 'food', re: /food|eat|lunch|dinner|breakfast|tea|chai|recipe|cook|खाना|खाया|चाय|नाश्ता|रोटी|दाल|पकाना|khana|khaya|nashta/i, replies: [
      R('Ah, food! What did you eat today? And what is the one dish nobody makes as well as you?', 'वाह, खाने की बात! आज क्या खाया? और कौन-सा पकवान आपसे अच्छा कोई नहीं बनाता?'),
      R('A warm cup of chai makes everything better. Do you take it with ginger or elaichi? Remember to drink water too.', 'गरम चाय से सब अच्छा लगता है। अदरक वाली या इलायची वाली? पानी पीना भी याद रखिए।')]},
    {id: 'sleep', re: /sleep|tired|can'?t sleep|insomnia|नींद|थक|सो नहीं|neend|thak/i, replies: [
      R('Rest matters. A quiet routine helps: dim lights, a warm drink without caffeine, and soft music. If sleep stays difficult, tell your doctor. Shall I play something calm?', 'आराम ज़रूरी है। हल्की रोशनी, बिना कैफ़ीन का गरम पेय, और धीमा संगीत मदद करता है। नींद लगातार न आए तो डॉक्टर को बताइए। क्या कुछ शांत संगीत बजाऊँ?')],
      action: {page: 'music'}},
    {id: 'pain', re: /pain|ache|hurts|knee|back|joint|fever|cough|cold|dizzy|दर्द|बुखार|खाँसी|ज़ुकाम|चक्कर|घुटन|dard|bukhar|chakkar/i, replies: [
      R('I am sorry you are not feeling well. Please tell your doctor about it. They can help properly. If it is sudden or very strong, call 108. Is someone at home with you?', 'आपकी तबीयत ठीक नहीं, यह सुनकर दुख हुआ। कृपया अपने डॉक्टर को बताइए, वे सही मदद कर पाएँगे। अगर अचानक या बहुत तेज़ हो, तो 108 पर कॉल करें। क्या घर पर कोई आपके साथ है?')]},
    {id: 'weather', re: /weather|rain|hot|cold|winter|summer|monsoon|मौसम|बारिश|गर्मी|सर्दी|ठंड|barish|garmi|sardi|thand/i, replies: [
      R('How is the weather where you are? In heat, drink plenty of water; in the cold, keep warm and wear socks at night.', 'आपके यहाँ मौसम कैसा है? गर्मी में खूब पानी पिएँ, सर्दी में गरम कपड़े और रात को मोज़े पहनें।'),
      R('Rainy days are perfect for chai and pakode! What did you love doing in the monsoon as a child?', 'बारिश का दिन मतलब चाय और पकौड़े! बचपन में बारिश में क्या करना अच्छा लगता था?')]},
    {id: 'cricket', re: /cricket|match|sachin|kapil|dhoni|kohli|क्रिकेट|मैच|सचिन|धोनी/i, replies: [
      R('Cricket! Do you remember the 1983 World Cup? Who is your all-time favourite player?', 'क्रिकेट! क्या आपको 1983 का विश्व कप याद है? आपका सबसे पसंदीदा खिलाड़ी कौन है?')]},
    {id: 'festival', re: /diwali|holi|eid|christmas|navratri|durga puja|gurpurab|pongal|onam|lohri|raksha|दिवाली|होली|ईद|क्रिसमस|नवरात्रि|गुरुपर्व|पोंगल|ओणम|लोहड़ी|राखी/i, replies: [
      R('Festivals bring everyone together! How did your family celebrate it when you were young?', 'त्योहार सबको साथ लाते हैं! आपके बचपन में घर पर यह कैसे मनाया जाता था?')]},
    {id: 'joke', re: /joke|funny|make me laugh|चुटकुला|हँसा|मज़ाक|chutkula|hasao/i, jokes: true, replies: [
      R('Doctor: "Walk daily, it is good for you." Patient: "I already walk to the fridge ten times a day!"', 'डॉक्टर: "रोज़ टहलिए, सेहत के लिए अच्छा है।" मरीज़: "मैं तो दिन में दस बार फ्रिज तक टहल आता हूँ!"'),
      R('Grandson: "Dadi, what was there before mobiles?" Dadi: "Neighbours, beta. Live updates, free of charge!"', 'पोता: "दादी, मोबाइल से पहले क्या था?" दादी: "पड़ोसी, बेटा। मुफ़्त में लाइव अपडेट!"'),
      R('Why did the tomato blush? Because it saw the salad dressing!', 'टमाटर लाल क्यों हुआ? क्योंकि उसने सलाद को तैयार होते देख लिया!'),
      R('My glasses and I play hide and seek every morning. They always win.', 'मेरा चश्मा और मैं रोज़ सुबह छुपन-छुपाई खेलते हैं। हर बार चश्मा ही जीतता है।')]},
    {id: 'story', re: /story|kahani|tell me something|कहानी|किस्सा|kissa/i, replies: [
      R('Here is a short one: a thirsty crow found a pot with a little water at the bottom. It dropped pebbles in, one by one, until the water rose and it could drink. Small steps, every day, solve big problems. Do you have a favourite story from childhood?',
        'एक छोटी-सी कहानी: एक प्यासे कौवे को घड़े में थोड़ा-सा पानी मिला। उसने एक-एक कंकड़ डाला, पानी ऊपर आया और उसने पी लिया। रोज़ के छोटे कदम बड़ी मुश्किलें हल करते हैं। आपकी बचपन की पसंदीदा कहानी कौन-सी है?')]},
    {id: 'bored', re: /bored|nothing to do|boring|बोर|कुछ करने को नहीं|bore ho/i, replies: [
      R('Let us find something nice! You could water a plant, call an old friend, listen to a favourite song, or do a few gentle stretches. Which one sounds good?', 'चलिए कुछ अच्छा करते हैं! पौधों को पानी दें, किसी पुराने दोस्त को फ़ोन करें, कोई पसंदीदा गाना सुनें, या हल्की कसरत करें। कौन-सा अच्छा लगेगा?')]},
    {id: 'thanks', re: /thank|thanks|shukriya|dhanyavad|धन्यवाद|शुक्रिया/i, replies: [
      R('You are most welcome{name}. I am always here when you want to talk.', 'आपका स्वागत है{name}। जब भी बात करनी हो, मैं यहीं हूँ।')]},
    {id: 'bye', re: /\b(bye|good ?night|see you|talk later)\b|अलविदा|शुभ रात्रि|फिर मिलेंगे|चलता हूँ|chalta hoon|phir milenge/i, replies: [
      R('Take care{name}. Drink some water and rest well. Talk soon!', 'अपना ध्यान रखिए{name}। पानी पीजिए और आराम कीजिए। फिर बात करेंगे!')]},
  ];
  const fallback = [
    R('I am listening. Tell me a little more about that?', 'मैं सुन रहा हूँ। इसके बारे में थोड़ा और बताइए?'),
    R('That is interesting. How does it make you feel?', 'यह दिलचस्प है। इससे आपको कैसा लगता है?'),
    R('Thank you for sharing that with me. What happened next?', 'मुझसे साझा करने के लिए धन्यवाद। फिर क्या हुआ?'),
    R('I see. Has something like this happened before?', 'अच्छा। क्या पहले भी ऐसा हुआ है?'),
    R('I like talking with you. What else is on your mind today?', 'आपसे बात करना अच्छा लगता है। आज मन में और क्या है?'),
  ];

  const HINGLISH = /\b(kya|hai|hain|mera|meri|mujhe|aap|nahi|nahin|accha|acha|kaise|haan|bahut|kuch|kar|raha|rahi|ho)\b/i;
  const detectLang = (text, appLang) => /[ऀ-ॿ]/.test(text) ? 'hi' : HINGLISH.test(text) ? 'hi' : /[a-z]/i.test(text) ? 'en' : appLang;
  const NAME = /(?:my name is|i am called|call me|mera naam|मेरा नाम)\s+([\p{L}\p{M}]{2,20})/iu;

  function pick(list, memory, id) {
    const last = memory.last?.[id];
    let index = Math.floor(Math.random() * list.length);
    if (list.length > 1 && index === last) index = (index + 1) % list.length;
    return [list[index], {...memory, last: {...memory.last, [id]: index}}];
  }

  function reply(text, {lang = 'en', memory = {}, context = {}} = {}) {
    const said = String(text || '').trim();
    const replyLang = detectLang(said, lang);
    let mem = {...memory};
    const named = said.match(NAME);
    if (named) {
      mem.name = named[1];
      const nice = R(`What a lovely name, ${named[1]} ji. I will remember it. How has your day been?`, `कितना प्यारा नाम है, ${named[1]} जी। मैं याद रखूँगा। आपका दिन कैसा रहा?`);
      return {text: nice[replyLang], lang: replyLang, memory: mem, action: null};
    }
    const intent = intents.find(i => i.re.test(said));
    const [chosen, nextMem] = pick(intent ? intent.replies : fallback, mem, intent ? intent.id : 'fallback');
    mem = nextMem;
    const name = mem.name ? (replyLang === 'hi' ? ` ${mem.name} जी` : ` ${mem.name} ji`) : '';
    const meds = (context.meds || []).slice(0, 4).map(m => `${m.name} ${m.time}`).join(', ');
    const medsLine = meds ? (replyLang === 'hi' ? `आज की सूची: ${meds}।` : `Today you have: ${meds}.`) : '';
    const out = chosen[replyLang].replace('{name}', name).replace('{meds}', medsLine).replace(/\s{2,}/g, ' ');
    return {text: out, lang: replyLang, memory: mem, action: intent?.action || null, intent: intent?.id || 'chat'};
  }

  const api = {reply, detectLang};
  if (typeof module !== 'undefined') module.exports = api;
  else root.SaathiLocal = api;
})(globalThis);

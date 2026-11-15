/* Step 5: a small thought for the day. Simple words, sometimes a little cheeky, never preachy
   about anyone's faith. The deck is shuffled and goes through every thought before any repeats. */
(function (root) {
  const Q = (topic, en, hi) => ({topic, en, hi});
  const quotes = [
    // Living together, across religions and castes
    Q('harmony', 'Temple bells and the azaan both wake us up. Neither asks which god we pray to before doing it.', 'मंदिर की घंटी और अज़ान, दोनों हमें जगाते हैं। जगाने से पहले कोई नहीं पूछता कि हम किसे पूजते हैं।'),
    Q('harmony', 'Your neighbour’s festival sweets taste just as sweet. Funny how sugar never checks religion.', 'पड़ोसी के त्योहार की मिठाई भी उतनी ही मीठी होती है। चीनी कभी धर्म नहीं पूछती।'),
    Q('harmony', 'Blood donated in a hospital does not come with a caste label. It just saves a life.', 'अस्पताल में दिया गया खून किसी जाति का ठप्पा लेकर नहीं आता। वह बस जान बचाता है।'),
    Q('harmony', 'Every faith teaches kindness. If a belief makes you hate someone, it is the hate talking, not God.', 'हर धर्म दया सिखाता है। अगर कोई बात किसी से नफ़रत कराए, तो वह नफ़रत बोल रही है, भगवान नहीं।'),
    Q('harmony', 'The doctor who treated you, the driver who brought you home, the farmer who grew your rice — did you ask their religion? No. Good.', 'जिस डॉक्टर ने इलाज किया, जिस ड्राइवर ने घर पहुँचाया, जिस किसान ने चावल उगाया — क्या आपने उनका धर्म पूछा? नहीं। बहुत अच्छा।'),
    Q('harmony', 'Sharing a cup of tea with someone from another community has never made anyone’s faith weaker. Only the tea gets finished.', 'दूसरे समुदाय के व्यक्ति के साथ चाय पीने से किसी का धर्म कमज़ोर नहीं होता। बस चाय ख़त्म होती है।'),
    Q('harmony', 'Untouchability is against the law in India, and against plain common sense too.', 'छुआछूत भारत में क़ानून के ख़िलाफ़ है, और सीधी-सादी समझ के भी।'),
    Q('harmony', 'Children don’t choose their caste or religion. Let’s not make them pay for something they never chose.', 'बच्चे अपनी जाति या धर्म नहीं चुनते। जो उन्होंने चुना ही नहीं, उसकी सज़ा उन्हें न दें।'),
    Q('harmony', 'What someone eats is between them and their plate. Your plate is enough to look after.', 'कोई क्या खाता है, यह उसके और उसकी थाली के बीच की बात है। अपनी थाली ही काफ़ी है।'),
    Q('harmony', 'Diwali lamps, Eid lights, Christmas stars, Gurpurab candles — India just likes light. So do we.', 'दिवाली के दीये, ईद की रोशनी, क्रिसमस के तारे, गुरुपर्व की मोमबत्तियाँ — भारत को बस रोशनी पसंद है। हमें भी।'),
    Q('harmony', 'A rumour about another community on WhatsApp? Before forwarding, ask: would I say this to their face?', 'व्हाट्सऐप पर किसी समुदाय के बारे में अफ़वाह? आगे भेजने से पहले सोचें: क्या मैं यह उनके सामने कह सकता हूँ?'),
    Q('harmony', 'Respect for elders is common to every religion in India. So is respect for those who are different from us.', 'बड़ों का आदर भारत के हर धर्म में है। जो हमसे अलग हैं, उनका आदर भी।'),

    // Beliefs and reality, gently
    Q('beliefs', 'Prayer can give peace of mind. Medicine treats the body. You are allowed to have both.', 'प्रार्थना मन को शांति दे सकती है। दवा शरीर का इलाज करती है। दोनों साथ रख सकते हैं।'),
    Q('beliefs', 'A black cat crossing the road is only a cat going somewhere. It has its own errands.', 'रास्ता काटती काली बिल्ली बस कहीं जा रही बिल्ली है। उसके भी अपने काम हैं।'),
    Q('beliefs', 'No ring, thread or stone can cure sugar or BP. Your doctor and your daily walk can help.', 'कोई अँगूठी, धागा या पत्थर शुगर या बीपी ठीक नहीं करता। डॉक्टर और रोज़ की सैर मदद कर सकते हैं।'),
    Q('beliefs', 'If someone asks for money to remove a "curse", the only thing removed will be your money.', 'अगर कोई "श्राप" हटाने के पैसे माँगे, तो हटेगा बस आपका पैसा।'),
    Q('beliefs', 'An eclipse is the moon and the earth passing each other’s shadow. Your food is safe to eat after it.', 'ग्रहण बस चाँद और धरती की परछाईं का खेल है। उसके बाद खाना खाना बिल्कुल ठीक है।'),
    Q('beliefs', 'Faith is personal and precious. Using it to frighten or cheat people is neither.', 'आस्था निजी और अनमोल है। उसके नाम पर डराना या ठगना, न निजी है न अनमोल।'),
    Q('beliefs', 'A daughter brings the same luck as a son. The numbers on your bank statement agree.', 'बेटी भी उतना ही सौभाग्य लाती है जितना बेटा। आपकी बैंक पासबुक भी यही कहती है।'),
    Q('beliefs', 'Sneezing before leaving home only means you need a tissue, not that your work will fail.', 'घर से निकलते हुए छींक आना बस रूमाल की ज़रूरत है, काम बिगड़ने की निशानी नहीं।'),
    Q('beliefs', 'Mental illness is not a ghost or a punishment. It is an illness, and it can be treated.', 'मानसिक बीमारी कोई भूत या सज़ा नहीं है। यह एक बीमारी है, और इसका इलाज हो सकता है।'),
    Q('beliefs', 'You can keep your traditions and still ask "why?". Good traditions can answer.', 'अपनी परंपराएँ रखते हुए भी "क्यों?" पूछ सकते हैं। अच्छी परंपराओं के पास जवाब होता है।'),

    // Clean surroundings and civic sense
    Q('civic', 'Throwing a wrapper out of the bus window does not make it disappear. It just moves to someone else’s street.', 'बस की खिड़की से फेंका रैपर गायब नहीं होता। बस किसी और की गली में पहुँच जाता है।'),
    Q('civic', 'We clean our homes for Diwali. The road outside is also somebody’s home.', 'दिवाली पर हम घर साफ़ करते हैं। बाहर की सड़क भी किसी का घर है।'),
    Q('civic', 'Spitting paan on walls: the wall did not ask for new paint. Please use a dustbin.', 'दीवारों पर पान थूकना: दीवार ने नया रंग नहीं माँगा था। कृपया कूड़ेदान का इस्तेमाल करें।'),
    Q('civic', 'Rivers we call holy deserve better than plastic bags. Let flowers go to compost, not the Ganga.', 'जिन नदियों को हम पवित्र कहते हैं, वे प्लास्टिक की थैलियों से बेहतर की हक़दार हैं। फूल खाद में डालें, गंगा में नहीं।'),
    Q('civic', 'Carry a cloth bag to the market. Your grandparents did it long before it was fashionable.', 'बाज़ार कपड़े का थैला लेकर जाएँ। आपके दादा-दादी यह फ़ैशन बनने से बहुत पहले करते थे।'),
    Q('civic', 'A dripping tap wastes buckets of water a day. Fixing it is cheaper than the water tanker.', 'टपकता नल रोज़ बाल्टियों पानी बर्बाद करता है। उसे ठीक कराना पानी के टैंकर से सस्ता है।'),
    Q('civic', 'Honking does not make traffic move faster. If it did, India would have no traffic at all.', 'हॉर्न बजाने से ट्रैफ़िक तेज़ नहीं चलता। अगर चलता, तो भारत में ट्रैफ़िक होता ही नहीं।'),
    Q('civic', 'Standing in a queue is not a sign of weakness. Pushing ahead is not a sign of strength.', 'लाइन में खड़े होना कमज़ोरी नहीं है। धक्का देकर आगे जाना ताक़त नहीं है।'),
    Q('civic', 'Separate wet and dry waste at home. It takes ten seconds and saves the sweeper an hour.', 'घर पर गीला और सूखा कूड़ा अलग करें। इसमें दस सेकंड लगते हैं और सफ़ाईकर्मी का एक घंटा बचता है।'),
    Q('civic', 'Your vote is your voice. Even if your knees hurt, polling booths have chairs and help for seniors.', 'आपका वोट आपकी आवाज़ है। घुटने दर्द करें तो भी, मतदान केंद्र पर बुज़ुर्गों के लिए कुर्सी और मदद होती है।'),
    Q('civic', 'Planting one tree for a grandchild is a gift that keeps growing.', 'पोते-पोती के लिए एक पेड़ लगाना ऐसा तोहफ़ा है जो बढ़ता ही रहता है।'),

    // Staying safe from scams
    Q('safety', 'No bank, police or government office will ever ask for your OTP on the phone. Not even politely.', 'कोई बैंक, पुलिस या सरकारी दफ़्तर फ़ोन पर आपका OTP कभी नहीं माँगेगा। प्यार से भी नहीं।'),
    Q('safety', 'You did not enter a lottery, so you did not win one. That prize call is a thief with good manners.', 'आपने कोई लॉटरी नहीं डाली, तो जीती भी नहीं। वह इनाम वाला फ़ोन तमीज़ वाला चोर है।'),
    Q('safety', '"Your account will be blocked today!" Real banks are never in such a hurry. Hang up and call your branch.', '"आज आपका खाता बंद हो जाएगा!" असली बैंक इतनी जल्दी में नहीं होते। फ़ोन काटें और अपनी शाखा को फ़ोन करें।'),
    Q('safety', 'A video call from "police" asking for money is not the police. Real police come in person, not on WhatsApp.', 'पैसे माँगने वाली "पुलिस" की वीडियो कॉल पुलिस नहीं है। असली पुलिस घर आती है, व्हाट्सऐप पर नहीं।'),
    Q('safety', 'If a message makes you scared and rushed, it was written to make you scared and rushed. Wait and ask family.', 'जो संदेश आपको डराए और जल्दी कराए, वह इसी लिए लिखा गया है। रुकिए और घरवालों से पूछिए।'),
    Q('safety', 'Cyber fraud? Call 1930. The sooner you call, the better the chance of saving your money.', 'साइबर ठगी? 1930 पर कॉल करें। जितनी जल्दी कॉल करेंगे, पैसे बचने की उम्मीद उतनी ज़्यादा।'),
    Q('safety', 'Wonder cures sold on WhatsApp mostly cure one thing: a full wallet.', 'व्हाट्सऐप पर बिकने वाले चमत्कारी इलाज ज़्यादातर एक ही चीज़ ठीक करते हैं: भरा हुआ बटुआ।'),

    // Health, gently
    Q('health', 'Taking your medicine on time is not a sign of old age. It is a sign of good sense.', 'समय पर दवा लेना बुढ़ापे की निशानी नहीं, समझदारी की निशानी है।'),
    Q('health', 'Never stop a medicine just because you feel better. Ask your doctor first.', 'ठीक लगने पर भी दवा अपने आप बंद न करें। पहले डॉक्टर से पूछें।'),
    Q('health', 'Thirst gets quieter with age, but your body still needs water. Sip through the day.', 'उम्र के साथ प्यास कम लगती है, पर शरीर को पानी फिर भी चाहिए। दिन भर थोड़ा-थोड़ा पीते रहें।'),
    Q('health', 'A short walk after meals is free medicine. No prescription needed.', 'खाने के बाद थोड़ी सैर मुफ़्त की दवा है। कोई पर्चा नहीं चाहिए।'),
    Q('health', 'Feeling sad for many days is worth telling a doctor about, just like a fever.', 'कई दिनों तक उदासी रहे तो डॉक्टर को बताना उतना ही ज़रूरी है जितना बुखार में।'),
    Q('health', 'Vaccines are not only for children. Ask your doctor about flu and pneumonia shots.', 'टीके सिर्फ़ बच्चों के लिए नहीं होते। फ्लू और निमोनिया के टीके के बारे में डॉक्टर से पूछें।'),
    Q('health', 'Hearing aids and glasses are not embarrassing. Missing the conversation is.', 'सुनने की मशीन और चश्मा शर्म की बात नहीं हैं। बातचीत छूट जाना है।'),
    Q('health', 'A night light on the way to the bathroom prevents more falls than any amount of luck.', 'बाथरूम के रास्ते में एक छोटी लाइट, क़िस्मत से ज़्यादा गिरने से बचाती है।'),

    // Equality and dignity
    Q('equality', 'Women have the same right to property as men. It is the law, not a favour.', 'महिलाओं का संपत्ति पर उतना ही हक़ है जितना पुरुषों का। यह क़ानून है, एहसान नहीं।'),
    Q('equality', 'Dowry is illegal. A marriage built on gifts is a shop, not a family.', 'दहेज ग़ैरक़ानूनी है। तोहफ़ों पर बनी शादी दुकान है, परिवार नहीं।'),
    Q('equality', 'The person who cleans your street deserves the same "namaste" as the person who owns it.', 'जो आपकी गली साफ़ करता है, वह भी उसी "नमस्ते" का हक़दार है जो गली के मालिक को मिलता है।'),
    Q('equality', 'Children belong in school, not in tea stalls. A small help today can change a whole life.', 'बच्चों की जगह स्कूल में है, चाय की दुकान पर नहीं। आज की छोटी-सी मदद पूरी ज़िंदगी बदल सकती है।'),
    Q('equality', 'A widow wearing colours is not breaking any rule of kindness. Let her smile.', 'रंगीन कपड़े पहनने वाली विधवा दया का कोई नियम नहीं तोड़ रही। उसे मुस्कुराने दें।'),
    Q('equality', 'Asking a daughter-in-law for her opinion has never brought bad luck to any home.', 'बहू से उसकी राय पूछने से किसी घर में कभी अपशकुन नहीं हुआ।'),
    Q('equality', 'People with disabilities do not need pity. They need ramps, patience and respect.', 'दिव्यांग लोगों को दया नहीं चाहिए। उन्हें रैंप, धैर्य और सम्मान चाहिए।'),

    // Kindness and connection
    Q('kindness', 'Your stories are a library. Lend one to a grandchild today — no late fees.', 'आपकी कहानियाँ एक पुस्तकालय हैं। आज किसी पोते-पोती को एक सुनाइए — कोई जुर्माना नहीं।'),
    Q('kindness', 'Calling an old friend takes two minutes and can make both of your days.', 'किसी पुराने दोस्त को फ़ोन करने में दो मिनट लगते हैं, और दोनों का दिन बन सकता है।'),
    Q('kindness', 'It is never too late to learn something new. Even this app was new to you once.', 'कुछ नया सीखने में कभी देर नहीं होती। यह ऐप भी कभी आपके लिए नया था।'),
    Q('kindness', 'Saying sorry is not losing. It is how old friendships stay young.', 'माफ़ी माँगना हारना नहीं है। इसी से पुरानी दोस्तियाँ जवान रहती हैं।'),
    Q('kindness', 'Feed a bird, water a plant, smile at a stranger. Small kindness still counts.', 'किसी पक्षी को दाना, किसी पौधे को पानी, किसी अजनबी को मुस्कान। छोटी दया भी गिनी जाती है।'),
    Q('kindness', 'Asking for help is not a burden on others. Most people are happy to be asked.', 'मदद माँगना दूसरों पर बोझ नहीं है। ज़्यादातर लोग पूछे जाने पर खुश होते हैं।'),
  ];

  /* Fisher–Yates shuffle with an injectable random source (tests pass a seeded one). */
  function shuffle(n, random = Math.random) {
    const order = Array.from({length: n}, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    return order;
  }

  /* deck = {order:[indexes], pos}. Returns the next quote index and the updated deck.
     Every quote appears once per round; a new round never starts with the one just shown. */
  function next(deck, random = Math.random) {
    let {order, pos} = deck && Array.isArray(deck.order) && deck.order.length === quotes.length ? deck : {order: shuffle(quotes.length, random), pos: 0};
    if (pos >= order.length) {
      const last = order[order.length - 1];
      order = shuffle(quotes.length, random);
      if (order[0] === last) [order[0], order[1]] = [order[1], order[0]];
      pos = 0;
    }
    return {index: order[pos], deck: {order, pos: pos + 1}};
  }

  const api = {quotes, next, shuffle};
  if (typeof module !== 'undefined') module.exports = api;
  else root.Quotes = api;
})(globalThis);

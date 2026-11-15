/* Step 4: a gentle question-by-question music guide. Pure data and logic, no DOM. */
(function (root) {
  const o = (id, en, hi, term, next = null) => ({id, en, hi, term, next});
  const nodes = {
    singer: {en: 'Is there a singer you love?', hi: 'क्या कोई गायक आपको बहुत पसंद हैं?',
      help: ['Type a name, like Lata Mangeshkar or Kishore Kumar. Or skip.', 'नाम लिखें, जैसे लता मंगेशकर या किशोर कुमार। या आगे बढ़ें।'],
      input: true, next: 'type'},
    type: {en: 'What kind of music would you like?', hi: 'कैसा संगीत सुनना चाहेंगे?', options: [
      o('religious', 'Religious & devotional', 'धार्मिक और भक्ति', '', 'faith'),
      o('oldfilm', 'Old film songs', 'पुराने फ़िल्मी गाने', 'old hindi film songs', 'era'),
      o('classical', 'Classical', 'शास्त्रीय संगीत', '', 'classical'),
      o('ghazal', 'Ghazals', 'ग़ज़ल', 'best ghazals'),
      o('sufi', 'Sufi & qawwali', 'सूफ़ी और क़व्वाली', 'sufi qawwali'),
      o('folk', 'Folk songs', 'लोक गीत', 'folk songs', 'language'),
      o('regional', 'Songs in my language', 'मेरी भाषा के गाने', 'old songs', 'language'),
      o('patriotic', 'Patriotic songs', 'देशभक्ति गीत', 'desh bhakti geet'),
      o('instrumental', 'Instrumental & calm', 'वाद्य और शांत संगीत', '', 'instrument'),
      o('nature', 'Nature sounds for rest', 'आराम के लिए प्रकृति की आवाज़ें', 'relaxing nature sounds rain birds'),
      o('english', 'Old English songs', 'पुराने अंग्रेज़ी गाने', 'classic english songs 60s 70s'),
    ]},
    faith: {en: 'Which faith’s songs would you like?', hi: 'किस धर्म के भजन या गीत सुनना चाहेंगे?', options: [
      o('hindu', 'Hindu bhajans & aarti', 'हिंदू भजन और आरती', '', 'deity'),
      o('muslim', 'Islamic naat & hamd', 'इस्लामी नात और हम्द', '', 'islamic'),
      o('sikh', 'Sikh gurbani & shabad', 'सिख गुरबाणी और शबद', 'gurbani shabad kirtan'),
      o('christian', 'Christian hymns', 'ईसाई प्रार्थना गीत', 'hindi christian worship songs hymns'),
      o('buddhist', 'Buddhist chants', 'बौद्ध मंत्र', 'buddham saranam gacchami buddhist chanting'),
      o('jain', 'Jain stavan', 'जैन स्तवन', 'jain stavan navkar mantra'),
      o('parsi', 'Parsi prayers', 'पारसी प्रार्थना', 'zoroastrian parsi prayer ashem vohu'),
      o('jewish', 'Jewish prayer songs', 'यहूदी प्रार्थना गीत', 'jewish prayer songs'),
      o('allfaith', 'Songs for all faiths', 'सभी धर्मों के लिए गीत', 'sarva dharma prarthana vaishnav jan to raghupati raghav'),
    ]},
    deity: {en: 'Any special bhajan?', hi: 'कोई ख़ास भजन?', options: [
      o('krishna', 'Shri Krishna', 'श्री कृष्ण', 'krishna bhajan'),
      o('ram', 'Shri Ram', 'श्री राम', 'ram bhajan'),
      o('shiv', 'Lord Shiva', 'भगवान शिव', 'shiv bhajan'),
      o('hanuman', 'Hanuman Chalisa', 'हनुमान चालीसा', 'hanuman chalisa'),
      o('ganesh', 'Lord Ganesh', 'भगवान गणेश', 'ganesh aarti bhajan'),
      o('durga', 'Mata Rani', 'माता रानी', 'mata rani bhajan'),
      o('sai', 'Sai Baba', 'साईं बाबा', 'sai baba bhajan'),
      o('aarti', 'Morning aarti', 'सुबह की आरती', 'morning aarti'),
      o('any', 'Any bhajan', 'कोई भी भजन', 'popular hindi bhajans'),
    ]},
    islamic: {en: 'What would you like to hear?', hi: 'क्या सुनना चाहेंगे?', options: [
      o('naat', 'Naat', 'नात', 'naat sharif'),
      o('hamd', 'Hamd', 'हम्द', 'hamd'),
      o('quran', 'Quran recitation', 'क़ुरान तिलावत', 'quran recitation beautiful'),
      o('qawwali', 'Qawwali', 'क़व्वाली', 'qawwali'),
    ]},
    classical: {en: 'Which classical style?', hi: 'कौन-सा शास्त्रीय संगीत?', options: [
      o('hindustani', 'Hindustani vocal', 'हिंदुस्तानी गायन', 'hindustani classical vocal raag'),
      o('carnatic', 'Carnatic', 'कर्नाटक संगीत', 'carnatic classical music'),
      o('morning', 'Morning raag', 'सुबह के राग', 'morning raag bhairav'),
      o('evening', 'Evening raag', 'शाम के राग', 'evening raag yaman'),
    ]},
    instrument: {en: 'Which instrument?', hi: 'कौन-सा वाद्य?', options: [
      o('sitar', 'Sitar', 'सितार', 'sitar instrumental'),
      o('flute', 'Flute (bansuri)', 'बाँसुरी', 'bansuri flute instrumental'),
      o('shehnai', 'Shehnai', 'शहनाई', 'shehnai instrumental'),
      o('santoor', 'Santoor', 'संतूर', 'santoor instrumental'),
      o('veena', 'Veena', 'वीणा', 'veena instrumental'),
      o('piano', 'Soft piano', 'धीमा पियानो', 'old hindi songs soft piano instrumental'),
    ]},
    era: {en: 'Which years bring back memories?', hi: 'कौन-से साल की यादें?', options: [
      o('50s', '1950s–60s', '1950–60 का दशक', '1950s 1960s'),
      o('70s', '1970s', '1970 का दशक', '1970s'),
      o('80s', '1980s', '1980 का दशक', '1980s'),
      o('90s', '1990s', '1990 का दशक', '1990s'),
      o('anyera', 'Any time', 'कोई भी समय', 'evergreen'),
    ]},
    language: {en: 'Which language?', hi: 'कौन-सी भाषा?', options: [
      ['hindi', 'Hindi', 'हिंदी'], ['marathi', 'Marathi', 'मराठी'], ['bengali', 'Bengali', 'बांग्ला'], ['tamil', 'Tamil', 'तमिल'],
      ['telugu', 'Telugu', 'तेलुगु'], ['kannada', 'Kannada', 'कन्नड़'], ['malayalam', 'Malayalam', 'मलयालम'],
      ['gujarati', 'Gujarati', 'गुजराती'], ['punjabi', 'Punjabi', 'पंजाबी'], ['bhojpuri', 'Bhojpuri', 'भोजपुरी'],
      ['odia', 'Odia', 'ओड़िया'], ['assamese', 'Assamese', 'असमिया'], ['rajasthani', 'Rajasthani', 'राजस्थानी'],
    ].map(([id, en, hi]) => o(id, en, hi, en))},
  };

  /* answers: [{node, value}] in order. Returns the next node id, or null when ready to play. */
  function nextNode(answers) {
    if (!answers.length) return 'singer';
    const last = answers.at(-1), node = nodes[last.node];
    if (!node) return null;
    if (node.input) return node.next;
    const option = node.options.find(x => x.id === last.value);
    return option ? option.next : null;
  }

  function buildQuery(answers) {
    const parts = [];
    let singer = '';
    for (const a of answers) {
      const node = nodes[a.node];
      if (!node) continue;
      if (node.input) { singer = String(a.value || '').replace(/[^\p{L}\p{M}\p{N} .'-]/gu, '').trim().slice(0, 60); continue; }
      const option = node.options.find(x => x.id === a.value);
      if (option?.term) parts.push(option.term);
    }
    if (singer) parts.unshift(singer, parts.length ? '' : 'songs');
    return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  const api = {nodes, nextNode, buildQuery};
  if (typeof module !== 'undefined') module.exports = api;
  else root.MusicGuide = api;
})(globalThis);

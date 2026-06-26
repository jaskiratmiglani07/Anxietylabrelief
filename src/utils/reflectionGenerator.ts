export interface Reflection {
  sentences: string[];
}

/**
 * Extracts and reformats the core worry from the user's raw input
 */
function extractCoreWorry(input: string): string {
  let text = input.trim();
  
  // Remove trailing question marks, periods, or exclamation marks
  text = text.replace(/[?.!]+$/, '');
  
  // Normalize contractions and common prefixes
  const prefixes = [
    /^(i'm|i am|feeling)\s+(worried|scared|anxious|stressed|fearful|afraid)\s+(about|that|of)\s+/i,
    /^(i'm|i am|feeling)\s+(worried|scared|anxious|stressed|fearful|afraid)\s+/i,
    /^i\s+(worry|fear|regret|dread)\s+(about|that|of)?\s*/i,
    /^what\s+if\s+/i,
    /^i've\s+been\s+(worrying|stressing)\s+about\s+/i,
    /^i\s+have\s+a\s+fear\s+that\s+/i,
    /^i\s+am\s+really\s+stressed\s+(about|by)\s+/i,
    /^stressing\s+about\s+/i,
    /^scared\s+(of|that|i'll|i\s+will)?\s*/i,
    /^worried\s+(about|that|i'll|i\s+will)?\s*/i,
  ];

  for (const regex of prefixes) {
    if (regex.test(text)) {
      text = text.replace(regex, '');
      break;
    }
  }

  // Convert pronouns to second person perspective for the reflection
  const pronounMap: [RegExp, string][] = [
    [/\bmy\b/gi, 'your'],
    [/\bmine\b/gi, 'yours'],
    [/\bme\b/gi, 'you'],
    [/\bmyself\b/gi, 'yourself'],
    [/\bi\b/gi, 'you'],
    [/\bi'm\b/gi, "you're"],
    [/\bi'll\b/gi, "you'll"],
    [/\bi've\b/gi, "you've"],
    [/\bi'd\b/gi, "you'd"],
    [/\bwe\b/gi, 'you'],
    [/\bour\b/gi, 'your'],
    [/\bus\b/gi, 'you'],
  ];

  for (const [regex, replacement] of pronounMap) {
    text = text.replace(regex, replacement);
  }

  if (text.length > 0) {
    text = text.charAt(0).toLowerCase() + text.slice(1);
  }

  return text || "this current stressor";
}

type WorryCategory = 
  | 'interview' 
  | 'exam' 
  | 'career' 
  | 'friends' 
  | 'romance' 
  | 'lonely' 
  | 'regret' 
  | 'health' 
  | 'worth' 
  | 'future' 
  | 'general';

/**
 * Categorizes the worry into highly specific sub-themes
 */
function categorizeWorry(input: string): WorryCategory {
  const lowercase = input.toLowerCase();
  
  if (
    lowercase.includes('interview') ||
    lowercase.includes('interviews') ||
    lowercase.includes('hired') ||
    lowercase.includes('hiring') ||
    lowercase.includes('recruiter') ||
    lowercase.includes('resume')
  ) {
    return 'interview';
  }

  if (
    lowercase.includes('exam') ||
    lowercase.includes('test') ||
    lowercase.includes('quiz') ||
    lowercase.includes('exams') ||
    lowercase.includes('finals') ||
    lowercase.includes('midterm') ||
    lowercase.includes('midterms') ||
    lowercase.includes('grade') ||
    lowercase.includes('grades') ||
    lowercase.includes('studying') ||
    lowercase.includes('study') ||
    lowercase.includes('college') ||
    lowercase.includes('school') ||
    lowercase.includes('university') ||
    lowercase.includes('class')
  ) {
    return 'exam';
  }

  if (
    lowercase.includes('friend') ||
    lowercase.includes('friends') ||
    lowercase.includes('dislike') ||
    lowercase.includes('hate') ||
    lowercase.includes('ignore') ||
    lowercase.includes('ignoring') ||
    lowercase.includes('talk about') ||
    lowercase.includes('left out') ||
    lowercase.includes('fit in') ||
    lowercase.includes('fitting in') ||
    lowercase.includes('laughing at') ||
    lowercase.includes('popular') ||
    lowercase.includes('group') ||
    lowercase.includes('classmates')
  ) {
    return 'friends';
  }

  if (
    lowercase.includes('girlfriend') ||
    lowercase.includes('boyfriend') ||
    lowercase.includes('husband') ||
    lowercase.includes('wife') ||
    lowercase.includes('partner') ||
    lowercase.includes('spouse') ||
    lowercase.includes('crush') ||
    lowercase.includes('dating') ||
    lowercase.includes('breakup') ||
    lowercase.includes('break up') ||
    lowercase.includes('divorce') ||
    lowercase.includes('love me') ||
    lowercase.includes('loves me') ||
    lowercase.includes('rejection') ||
    lowercase.includes('rejected')
  ) {
    return 'romance';
  }

  if (
    lowercase.includes('lonely') ||
    lowercase.includes('alone') ||
    lowercase.includes('no one') ||
    lowercase.includes('nobody') ||
    lowercase.includes('isolated') ||
    lowercase.includes('isolation')
  ) {
    return 'lonely';
  }

  if (
    lowercase.includes('should have') ||
    lowercase.includes('should\'ve') ||
    lowercase.includes('wish i') ||
    lowercase.includes('regret') ||
    lowercase.includes('regretting') ||
    lowercase.includes('mistake') ||
    lowercase.includes('mistakes') ||
    lowercase.includes('messed up') ||
    lowercase.includes('screwed up') ||
    lowercase.includes('yesterday') ||
    lowercase.includes('past') ||
    lowercase.includes('could have') ||
    lowercase.includes('could\'ve') ||
    lowercase.includes('chose') ||
    lowercase.includes('choose')
  ) {
    return 'regret';
  }

  if (
    lowercase.includes('career') ||
    lowercase.includes('job') ||
    lowercase.includes('work') ||
    lowercase.includes('boss') ||
    lowercase.includes('manager') ||
    lowercase.includes('promotion') ||
    lowercase.includes('deadline') ||
    lowercase.includes('project') ||
    lowercase.includes('fired') ||
    lowercase.includes('firing') ||
    lowercase.includes('business') ||
    lowercase.includes('workspace') ||
    lowercase.includes('office')
  ) {
    return 'career';
  }

  if (
    lowercase.includes('sick') ||
    lowercase.includes('disease') ||
    lowercase.includes('illness') ||
    lowercase.includes('ill') ||
    lowercase.includes('pain') ||
    lowercase.includes('cancer') ||
    lowercase.includes('tumor') ||
    lowercase.includes('dying') ||
    lowercase.includes('death') ||
    lowercase.includes('die') ||
    lowercase.includes('body') ||
    lowercase.includes('symptom') ||
    lowercase.includes('symptoms') ||
    lowercase.includes('health') ||
    lowercase.includes('hospital') ||
    lowercase.includes('doctor')
  ) {
    return 'health';
  }

  if (
    lowercase.includes('good enough') ||
    lowercase.includes('failure') ||
    lowercase.includes('fail') ||
    lowercase.includes('useless') ||
    lowercase.includes('worthless') ||
    lowercase.includes('imposter') ||
    lowercase.includes('fraud') ||
    lowercase.includes('disappointment') ||
    lowercase.includes('disappoint')
  ) {
    return 'worth';
  }

  if (
    lowercase.includes('future') ||
    lowercase.includes('what if') ||
    lowercase.includes('unknown') ||
    lowercase.includes('upcoming') ||
    lowercase.includes('tomorrow') ||
    lowercase.includes('next year') ||
    lowercase.includes('dread')
  ) {
    return 'future';
  }

  return 'general';
}

/**
 * Generates exactly 8 original, grounded, and realistic reflections tailored to the user's worry.
 */
export function generateReflection(input: string): Reflection {
  const coreWorry = extractCoreWorry(input);
  const category = categorizeWorry(input);
  
  // Grounded and realistic templates generating exactly 8 reflections per category.
  const templates: Record<WorryCategory, string[]> = {
    interview: [
      "Right now your brain is focusing heavily on the possibility of failure because this interview feels important.",
      "But worrying about failing does not make failure more likely.",
      `The fact that you are concerned about ${coreWorry} means you have been taking it seriously and preparing.`,
      "An interview is just a conversation between people, not a final judgment on your capability or your value.",
      "Even if it does not go perfectly, you will learn from it and have other opportunities to show your skills.",
      "You have navigated difficult professional conversations before, and you will manage this one too.",
      "For these few minutes, you do not need to prepare any answers or rehearse what to say.",
      "Let the pressure rest. Take a slow breath, and bring your focus back to the quiet of this room."
    ],
    
    exam: [
      "It is completely normal to feel stressed when you are facing an exam that you want to do well on.",
      `Your mind is treating ${coreWorry} like a boundary on your entire future, but it is just one evaluation.`,
      "A single grade or test score can never measure the depth of your intelligence or your potential.",
      "Worrying about failing does not help you remember answers; it only drains the energy you need.",
      "You have studied and prepared, and you will do the best you can with what you know on that day.",
      "If the outcome isn't what you hoped, you can adjust your approach and try again. It is not the end of your path.",
      "For right now, the studying is done. There is nothing more you can prepare in this immediate second.",
      "Allow your mind to rest. Breathe out the tension, and let yourself just be here in the present."
    ],
    
    friends: [
      "When we are worried about our relationships, our minds often fill in quiet moments with negative explanations.",
      "Feeling uncertain about how others see you does not mean your fear is true.",
      `Your friends have their own busy lives, worries, and distractions that have nothing to do with ${coreWorry}.`,
      "It is exhausting to try to read other people's minds or search for signs that they are unhappy with you.",
      "Relationships have natural rhythms of closeness and distance; a quiet period is normal, not a rejection.",
      "You do not need to perform or be perfect to be worthy of connection and belonging.",
      "For this moment, set down the effort of trying to figure out what other people are thinking.",
      "Bring your attention back to yourself. Take a deep, steady breath, and let the silence feel safe."
    ],
    
    romance: [
      "It is hard when relationships feel uncertain, because you have allowed yourself to care deeply.",
      `Your mind is trying to protect you from hurt by anticipating what might happen with ${coreWorry}.`,
      "But worrying about what might happen in the future does not protect your relationship today.",
      "A relationship is a partnership of two separate people; you cannot control what the other person chooses.",
      "Your worth is not defined by whether someone else is able to give you the love or security you want.",
      "You are already a complete person on your own, regardless of the status of this connection.",
      "For the next few minutes, let go of trying to solve this relationship or fix the situation.",
      "Bring your focus inward. Inhale slowly, exhale completely, and let your body settle into this space."
    ],
    
    lonely: [
      "Feeling lonely is a painful experience, and it is natural to want to feel connected to others.",
      "But feeling isolated right now does not mean you will be alone forever.",
      `Solitude can feel like a permanent state when you are in the middle of ${coreWorry}, but seasons change.`,
      "Loneliness is simply a signal that you value connection; it is a normal human response.",
      "You do not need to find immediate connection or fix your social life in this very second.",
      "There are people out there who will value your company, even if you haven't met them yet.",
      "Let the urgency of finding someone to talk to fade into the background for a moment.",
      "Breathe in, knowing that you are company enough for yourself right now. Breathe out, and rest."
    ],
    
    regret: [
      "It is natural to look back and think about how your life might have turned out if you made a different choice.",
      "But your current stress comes from comparing reality to an imagined version of life that you can never verify.",
      `The choice you made about ${coreWorry} was based on the information, emotional state, and maturity you had then.`,
      "Judging your past self with the wisdom you only have today is unfair and keeps you stuck.",
      "The opportunity or decision is in the past, but the lesson you learned from it is still useful today.",
      "You cannot change what happened, but you can choose how you respond to your life from this point forward.",
      "Set down the heavy burden of 'what ifs' that you have been carrying.",
      "Forgive yourself for not knowing then what you know now. Breathe, and return to the present."
    ],
    
    career: [
      "It is easy to feel overwhelmed by career stress when your job feels tied to your survival and security.",
      `But ${coreWorry} is simply a set of tasks or situations you face, not a definition of who you are as a person.`,
      "A stressful week, a missed deadline, or a difficult project is just a temporary situation, not a career ender.",
      "Worrying about work outside of work hours does not get the tasks done; it only robs you of your recovery.",
      "You are allowed to have limits, and you do not need to solve every workplace problem today.",
      "You have navigated work challenges before, and you have the resourcefulness to figure this out too.",
      "For right now, the laptop is closed or the workspace is quiet. You are off duty.",
      "Let the professional demands fade. Inhale quietness, exhale work stress, and just rest."
    ],
    
    health: [
      "When we notice physical symptoms or feel vulnerable, our brain sounding a high-alert alarm is a normal survival response.",
      "But feeling anxious about your health does not mean you are in immediate danger.",
      `Our minds often jump to the worst possible diagnoses when we feel uncertain about ${coreWorry}.`,
      "Your body is constantly working to maintain balance and heal itself, even when you aren't paying attention.",
      "You do not need to diagnose yourself or guarantee absolute safety in this exact second.",
      "If you need to seek medical advice later, you can do so calmly and step-by-step.",
      "For this moment, observe the physical sensations without labeling them as dangerous.",
      "Let your body soften. Trust your breath to ground you, and feel the solid support beneath you."
    ],
    
    worth: [
      "The self-critical thoughts you are having feel like facts, but they are just old habits of thinking.",
      "Failing at a task or making a mistake does not make you a failure as a human being.",
      `You do not need to achieve or perform perfectly in ${coreWorry} to earn your right to exist and be respected.`,
      "Comparing your internal struggles to other people's external highlights will always make you feel inadequate.",
      "You are allowed to be imperfect; everyone is struggling with their own private doubts.",
      "Treat yourself with the same compassion and understanding you would easily offer to a friend.",
      "Let the exhausting demand to prove your worth crumble away.",
      "You are already enough, exactly as you are. Take a deep breath, and let the quiet hold you."
    ],
    
    future: [
      "The future is unknown, and it is completely normal to feel anxious about things you cannot predict.",
      `Your mind is trying to solve ${coreWorry} using today's limited energy.`,
      "Most of the negative scenarios you are worrying about will never actually occur.",
      "You do not need to figure out the next year, the next month, or even the next week right now.",
      "You have handled unexpected challenges in the past, and you will have the strength to handle whatever comes.",
      "Uncertainty is uncomfortable, but it also contains room for positive surprises and new beginnings.",
      "Let go of the need to control or predict the next chapter of your life.",
      "Bring your focus back to the only moment you can actually control: right here, right now."
    ],
    
    general: [
      "It is completely understandable to feel overwhelmed by this concern right now.",
      "Your mind is working overtime trying to find certainty and keep you safe from discomfort.",
      `But worrying about ${coreWorry} does not make it resolve any faster.`,
      "Acknowledge the physical tension you are carrying in response to this thought.",
      "You do not need to solve, fix, or decide anything about this situation in this exact minute.",
      "This feeling is intense right now, but like all feelings, it will eventually shift and soften.",
      "Give yourself permission to step away from the problem for just these few minutes.",
      "Take a slow, grounding breath, and let yourself simply exist in this quiet space."
    ]
  };

  return { sentences: templates[category] };
}

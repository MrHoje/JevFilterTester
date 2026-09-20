// 로컬 서버와 Cloudflare Function이 같은 정의를 쓰도록 한 곳에 모은다.

// 항목별 유해성 확률을 묻는다. 최종 통과/차단은 아래 임계값으로 코드가 정한다.
export const QUESTIONS = {
  profanity: { type: "noul", instructions: "Does the text contain profanity, slurs or vulgar language?" },
  violence: { type: "noul", instructions: "Does the text contain violent threats or incitement to violence?" },
  sexual_gambling: { type: "noul", instructions: "Does the text contain sexually explicit content, or promote, solicit or seek help with gambling?" },
  hate_self_harm: { type: "noul", instructions: "Does the text attack or demean a person or group based on identity, or encourage or describe self-harm or suicide?" },
  jailbreak: { type: "noul", instructions: "Does the text try to override, reveal or bypass the assistant's system instructions or safety rules?" },
  pii: { type: "noul", instructions: "Does the text expose personal data such as a resident registration number, phone number, address, card or account number?" },
  illegal: { type: "noul", instructions: "Does the text request help with illegal activity such as drugs, hacking, weapons or fraud?" },
  spam: { type: "noul", instructions: "Is the text unsolicited advertising, promotional spam or repeated junk content?" },
}

export const THRESHOLDS = {
  profanity: 0.7, violence: 0.5, sexual_gambling: 0.6, hate_self_harm: 0.4,
  jailbreak: 0.5, pii: 0.5, illegal: 0.5, spam: 0.7,
}

// EMR 문의사항을 어느 창구로 보낼지 고르는 별도 분류. 유해성 판정과 섞지 않는다.
export const INQUIRY = {
  inquiry_type: {
    type: "choice",
    criteria: {
      simple: "How to use the EMR product, installation, settings, account or licence questions answerable from the manual",
      support: "The product itself works, but the user cannot use it because of their environment: settings, network, printer, permissions or another machine",
      error: "A defect in the product itself: it crashes, shows an error, loses data or produces a wrong result",
      development: "A request for a new feature, a change to existing behaviour, customisation or an interface to another system",
      sales: "Contracts, quotations, licence purchase or renewal, pricing, or cancelling the service",
      training: "A request for user training, onboarding new staff, or a demonstration session",
      none: "Not an EMR inquiry at all: chit-chat, an insult, an empty complaint or anything unrelated to the product",
    },
    instructions: "Which team should handle this EMR inquiry?",
  },
}

// 긴급 여부만 본다. 화면에는 긴급인지 아닌지만 표시한다.
export const URGENCY = {
  urgent: {
    type: "noul",
    instructions: "Is this urgent? Urgent means clinical work is blocked right now, data is being lost, or many users are affected. A question, a request or a minor inconvenience is not urgent.",
  },
}

export const URGENT_THRESHOLD = 0.5

export function judge(answers) {
  const scores = {}
  for (const key of Object.keys(QUESTIONS)) scores[key] = answers?.[key]?.noul ?? null
  const flagged = Object.entries(scores).filter(([k, v]) => v !== null && v >= THRESHOLDS[k]).map(([k]) => k)
  const it = answers?.inquiry_type
  const inquiry = it ? { choice: it.choice, confidence: it.confidence, probabilities: it.probabilities } : null
  const u = answers?.urgent?.noul ?? null
  return {
    scores, thresholds: THRESHOLDS, flagged, blocked: flagged.length > 0, inquiry,
    urgent: u === null ? null : u >= URGENT_THRESHOLD,
  }
}

export const REQUEST_BODY = (text) => ({
  model: "jev-1.13",
  state: text,
  questions: { ...QUESTIONS, ...INQUIRY, ...URGENCY },
})

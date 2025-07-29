# Adaptive Vocabulary Learning - Prototype Design

## Overview

A simple prototype for A1-A2 vocabulary learning using spaced repetition and LLM-generated content. Users study Bulgarian or Hungarian words with AI-generated examples, grammar notes, and exercises.

## Core Features

- Predefined A1-A2 word lists (Bulgarian/Hungarian)
- LLM-generated content per word (examples, grammar, exercises)
- Four exercise types: multiple choice, fill-in-gap, sentence ordering, grammar form selection
- Basic spaced repetition algorithm
- Simple user rating (easy/medium/hard)
- Session counter (10 words goal)
- Full transliteration support for Bulgarian content

## Architecture

### Simple Data Models

```
Word {
  id: string
  text: string
  language: 'bulgarian' | 'hungarian'
  translation: string
  transliteration?: string (Bulgarian only)
  lastStudied: Date | null
  nextReview: Date
  performance: number (0-1)
  timesStudied: number
}

WordContent {
  wordId: string
  examples: LocalizedText[]
  grammar: GrammarInfo
  exercises: Exercise[]
}

LocalizedText {
  original: string
  transliteration?: string (Bulgarian only)
  translation: string
}

GrammarInfo {
  wordType: 'verb' | 'noun' | 'adjective' | 'adverb'
  details: VerbDetails | NounDetails | AdjectiveDetails | AdverbDetails
}

VerbDetails {
  conjugations: {
    present: PersonConjugations
    past: PersonConjugations
    future: PersonConjugations
  }
}

PersonConjugations {
  I: LocalizedText
  you: LocalizedText
  he: LocalizedText
  she: LocalizedText
  it: LocalizedText
  we: LocalizedText
  they: LocalizedText
}

NounDetails {
  gender: 'masculine' | 'feminine' | 'neuter'
  articles: {
    definite: LocalizedText
    indefinite: LocalizedText
  }
  plural: LocalizedText
}

AdjectiveDetails {
  genderForms: {
    masculine: LocalizedText
    feminine: LocalizedText
    neuter: LocalizedText
  }
}

AdverbDetails {
  usage: LocalizedText
  comparative?: LocalizedText
  superlative?: LocalizedText
}

Exercise {
  type: 'multiple_choice' | 'fill_gap' | 'sentence_order' | 'grammar_form'
  question: LocalizedText
  options?: LocalizedText[] (4 options for multiple choice/grammar form)
  correctAnswer: string
}

StudySession {
  wordsStudied: number
  target: 10
}
```

### LLM Integration

**Single API call per word** to OpenAI nano with structured output:

#### Verb Example (обичам - to love):
```json
{
  "examples": [
    {
      "original": "Аз обичам кучета",
      "transliteration": "Az obicham kucheta",
      "translation": "I love dogs"
    },
    {
      "original": "Те обичат котки",
      "transliteration": "Te obichat kotki",
      "translation": "They love cats"
    },
    {
      "original": "Ние обичахме морето",
      "transliteration": "Nie obichahme moreto",
      "translation": "We loved the sea"
    }
  ],
  "grammar": {
    "wordType": "verb",
    "details": {
      "conjugations": {
        "present": {
          "I": {
            "original": "аз обичам",
            "transliteration": "az obicham",
            "translation": "I love"
          },
          "you": {
            "original": "ти обичаш",
            "transliteration": "ti obichash",
            "translation": "you love"
          },
          "he": {
            "original": "той обича",
            "transliteration": "toy obicha",
            "translation": "he loves"
          },
          "she": {
            "original": "тя обича",
            "transliteration": "tya obicha",
            "translation": "she loves"
          },
          "it": {
            "original": "то обича",
            "transliteration": "to obicha",
            "translation": "it loves"
          },
          "we": {
            "original": "ние обичаме",
            "transliteration": "nie obichame",
            "translation": "we love"
          },
          "they": {
            "original": "те обичат",
            "transliteration": "te obichat",
            "translation": "they love"
          }
        },
        "past": {
          "I": {
            "original": "аз обичах",
            "transliteration": "az obichah",
            "translation": "I loved"
          },
          "you": {
            "original": "ти обича",
            "transliteration": "ti obicha",
            "translation": "you loved"
          },
          "he": {
            "original": "той обичаше",
            "transliteration": "toy obichashe",
            "translation": "he loved"
          },
          "she": {
            "original": "тя обичаше",
            "transliteration": "tya obichashe",
            "translation": "she loved"
          },
          "it": {
            "original": "то обичаше",
            "transliteration": "to obichashe",
            "translation": "it loved"
          },
          "we": {
            "original": "ние обичахме",
            "transliteration": "nie obichahme",
            "translation": "we loved"
          },
          "they": {
            "original": "те обичаха",
            "transliteration": "te obichaha",
            "translation": "they loved"
          }
        },
        "future": {
          "I": {
            "original": "аз ще обичам",
            "transliteration": "az shte obicham",
            "translation": "I will love"
          },
          "you": {
            "original": "ти ще обичаш",
            "transliteration": "ti shte obichash",
            "translation": "you will love"
          },
          "he": {
            "original": "той ще обича",
            "transliteration": "toy shte obicha",
            "translation": "he will love"
          },
          "she": {
            "original": "тя ще обича",
            "transliteration": "tya shte obicha",
            "translation": "she will love"
          },
          "it": {
            "original": "то ще обича",
            "transliteration": "to shte obicha",
            "translation": "it will love"
          },
          "we": {
            "original": "ние ще обичаме",
            "transliteration": "nie shte obichame",
            "translation": "we will love"
          },
          "they": {
            "original": "те ще обичат",
            "transliteration": "te shte obichat",
            "translation": "they will love"
          }
        }
      }
    }
  },
  "exercises": [
    {
      "type": "grammar_form",
      "question": {
        "original": "Изберете правилната форма: Той ___ кучета",
        "transliteration": "Izberete pravilnata forma: Toy ___ kucheta",
        "translation": "Choose the correct form: He ___ dogs"
      },
      "options": [
        {
          "original": "обичам",
          "transliteration": "obicham",
          "translation": "love (I)"
        },
        {
          "original": "обича",
          "transliteration": "obicha",
          "translation": "loves (he/she)"
        },
        {
          "original": "обичат",
          "transliteration": "obichat",
          "translation": "love (they)"
        },
        {
          "original": "обичаме",
          "transliteration": "obichame",
          "translation": "love (we)"
        }
      ],
      "correctAnswer": "обича"
    },
    {
      "type": "multiple_choice",
      "question": {
        "original": "Какво означава 'обичам'?",
        "transliteration": "Kakvo oznachava 'obicham'?",
        "translation": "What does 'obicham' mean?"
      },
      "options": [
        {
          "original": "мразя",
          "transliteration": "mrazya",
          "translation": "hate"
        },
        {
          "original": "обичам",
          "transliteration": "obicham",
          "translation": "love"
        },
        {
          "original": "виждам",
          "transliteration": "vizhdam",
          "translation": "see"
        },
        {
          "original": "чувам",
          "transliteration": "chuvam",
          "translation": "hear"
        }
      ],
      "correctAnswer": "love"
    },
    {
      "type": "fill_gap",
      "question": {
        "original": "Аз _____ моето семейство",
        "transliteration": "Az _____ moeto semeystvo",
        "translation": "I _____ my family"
      },
      "options": [
        {
          "original": "обичам",
          "transliteration": "obicham",
          "translation": "love"
        },
        {
          "original": "обичаш",
          "transliteration": "obichash",
          "translation": "love (you)"
        },
        {
          "original": "обича",
          "transliteration": "obicha",
          "translation": "loves"
        },
        {
          "original": "обичат",
          "transliteration": "obichat",
          "translation": "love (they)"
        }
      ],
      "correctAnswer": "обичам"
    },
    {
      "type": "sentence_order",
      "question": {
        "original": "Подредете думите в правилен ред:",
        "transliteration": "Podredete dumite v pravilen red:",
        "translation": "Arrange the words in correct order:"
      },
      "options": [
        {
          "original": "те",
          "transliteration": "te",
          "translation": "they"
        },
        {
          "original": "обичат",
          "transliteration": "obichat",
          "translation": "love"
        },
        {
          "original": "животни",
          "transliteration": "zhivotni",
          "translation": "animals"
        },
        {
          "original": "малки",
          "transliteration": "malki",
          "translation": "small"
        }
      ],
      "correctAnswer": "те обичат малки животни"
    },
    {
      "type": "multiple_choice",
      "question": {
        "original": "Кое е минало време за 'аз обичам'?",
        "transliteration": "Koe e minalo vreme za 'az obicham'?",
        "translation": "What is the past tense for 'I love'?"
      },
      "options": [
        {
          "original": "аз обичах",
          "transliteration": "az obichah",
          "translation": "I loved"
        },
        {
          "original": "аз ще обичам",
          "transliteration": "az shte obicham",
          "translation": "I will love"
        },
        {
          "original": "аз обичам",
          "transliteration": "az obicham",
          "translation": "I love"
        },
        {
          "original": "аз обичаше",
          "transliteration": "az obichashe",
          "translation": "I was loving"
        }
      ],
      "correctAnswer": "аз обичах"
    }
  ]
}
```

#### Noun Example (къща - house):
```json
{
  "examples": [
    {
      "original": "Това е моята къща",
      "transliteration": "Tova e moyata kashta",
      "translation": "This is my house"
    },
    {
      "original": "Къщите са красиви",
      "transliteration": "Kashtite sa krasivi",
      "translation": "The houses are beautiful"
    },
    {
      "original": "Купувам една къща",
      "transliteration": "Kupuvam edna kashta",
      "translation": "I am buying a house"
    }
  ],
  "grammar": {
    "wordType": "noun",
    "details": {
      "gender": "feminine",
      "articles": {
        "definite": {
          "original": "къщата",
          "transliteration": "kashtata",
          "translation": "the house"
        },
        "indefinite": {
          "original": "една къща",
          "transliteration": "edna kashta",
          "translation": "a house"
        }
      },
      "plural": {
        "original": "къщи",
        "transliteration": "kashti",
        "translation": "houses"
      }
    }
  },
  "exercises": [
    {
      "type": "grammar_form",
      "question": {
        "original": "Изберете правилния член: ___ къща е голяма",
        "transliteration": "Izberete pravilniya chlen: ___ kashta e golyama",
        "translation": "Choose the correct article: ___ house is big"
      },
      "options": [
        {
          "original": "къщата",
          "transliteration": "kashtata",
          "translation": "the house"
        },
        {
          "original": "една къща",
          "transliteration": "edna kashta",
          "translation": "a house"
        },
        {
          "original": "къщи",
          "transliteration": "kashti",
          "translation": "houses"
        },
        {
          "original": "къщите",
          "transliteration": "kashtite",
          "translation": "the houses"
        }
      ],
      "correctAnswer": "къщата"
    },
    {
      "type": "multiple_choice",
      "question": {
        "original": "Какъв е родът на 'къща'?",
        "transliteration": "Kakav e rodat na 'kashta'?",
        "translation": "What is the gender of 'house'?"
      },
      "options": [
        {
          "original": "мъжки",
          "transliteration": "mazhki",
          "translation": "masculine"
        },
        {
          "original": "женски",
          "transliteration": "zhenski",
          "translation": "feminine"
        },
        {
          "original": "среден",
          "transliteration": "sreden",
          "translation": "neuter"
        },
        {
          "original": "няма род",
          "transliteration": "nyama rod",
          "translation": "no gender"
        }
      ],
      "correctAnswer": "женски"
    },
    {
      "type": "fill_gap",
      "question": {
        "original": "Множественото число на 'къща' е _____",
        "transliteration": "Mnozhestvennoto chislo na 'kashta' e _____",
        "translation": "The plural of 'house' is _____"
      },
      "options": [
        {
          "original": "къщи",
          "transliteration": "kashti",
          "translation": "houses"
        },
        {
          "original": "къщата",
          "transliteration": "kashtata",
          "translation": "the house"
        },
        {
          "original": "къща",
          "transliteration": "kashta",
          "translation": "house"
        },
        {
          "original": "къщите",
          "transliteration": "kashtite",
          "translation": "the houses"
        }
      ],
      "correctAnswer": "къщи"
    },
    {
      "type": "sentence_order",
      "question": {
        "original": "Подредете думите в правилен ред:",
        "transliteration": "Podredete dumite v pravilen red:",
        "translation": "Arrange the words in correct order:"
      },
      "options": [
        {
          "original": "красива",
          "transliteration": "krasiva",
          "translation": "beautiful"
        },
        {
          "original": "къща",
          "transliteration": "kashta",
          "translation": "house"
        },
        {
          "original": "това",
          "transliteration": "tova",
          "translation": "this"
        },
        {
          "original": "е",
          "transliteration": "e",
          "translation": "is"
        }
      ],
      "correctAnswer": "това е красива къща"
    }
  ]
}
```

#### Adjective Example (красив - beautiful):
```json
{
  "examples": [
    {
      "original": "Красив мъж",
      "transliteration": "Krasiv mazh",
      "translation": "Beautiful man"
    },
    {
      "original": "Красива жена",
      "transliteration": "Krasiva zhena",
      "translation": "Beautiful woman"
    },
    {
      "original": "Красиво дете",
      "transliteration": "Krasivo dete",
      "translation": "Beautiful child"
    }
  ],
  "grammar": {
    "wordType": "adjective",
    "details": {
      "genderForms": {
        "masculine": {
          "original": "красив",
          "transliteration": "krasiv",
          "translation": "beautiful (masculine)"
        },
        "feminine": {
          "original": "красива",
          "transliteration": "krasiva",
          "translation": "beautiful (feminine)"
        },
        "neuter": {
          "original": "красиво",
          "transliteration": "krasivo",
          "translation": "beautiful (neuter)"
        }
      }
    }
  },
  "exercises": [
    {
      "type": "grammar_form",
      "question": {
        "original": "Изберете правилната форма: _____ къща",
        "transliteration": "Izberete pravilnata forma: _____ kashta",
        "translation": "Choose the correct form: _____ house"
      },
      "options": [
        {
          "original": "красив",
          "transliteration": "krasiv",
          "translation": "beautiful (masculine)"
        },
        {
          "original": "красива",
          "transliteration": "krasiva",
          "translation": "beautiful (feminine)"
        },
        {
          "original": "красиво",
          "transliteration": "krasivo",
          "translation": "beautiful (neuter)"
        },
        {
          "original": "красиви",
          "transliteration": "krasivi",
          "translation": "beautiful (plural)"
        }
      ],
      "correctAnswer": "красива"
    },
    {
      "type": "multiple_choice",
      "question": {
        "original": "Кое е женският род на 'красив'?",
        "transliteration": "Koe e zhenskiyat rod na 'krasiv'?",
        "translation": "What is the feminine form of 'beautiful'?"
      },
      "options": [
        {
          "original": "красив",
          "transliteration": "krasiv",
          "translation": "beautiful (masculine)"
        },
        {
          "original": "красива",
          "transliteration": "krasiva",
          "translation": "beautiful (feminine)"
        },
        {
          "original": "красиво",
          "transliteration": "krasivo",
          "translation": "beautiful (neuter)"
        },
        {
          "original": "красиви",
          "transliteration": "krasivi",
          "translation": "beautiful (plural)"
        }
      ],
      "correctAnswer": "красива"
    },
    {
      "type": "fill_gap",
      "question": {
        "original": "_____ момче играе футбол",
        "transliteration": "_____ momche igrae futbol",
        "translation": "_____ boy plays football"
      },
      "options": [
        {
          "original": "красив",
          "transliteration": "krasiv",
          "translation": "beautiful (masculine)"
        },
        {
          "original": "красива",
          "transliteration": "krasiva",
          "translation": "beautiful (feminine)"
        },
        {
          "original": "красиво",
          "transliteration": "krasivo",
          "translation": "beautiful (neuter)"
        },
        {
          "original": "красиви",
          "transliteration": "krasivi",
          "translation": "beautiful (plural)"
        }
      ],
      "correctAnswer": "красиво"
    }
  ]
}
```

#### Adverb Example (бързо - quickly):
```json
{
  "examples": [
    {
      "original": "Той тича бързо",
      "transliteration": "Toy ticha barzo",
      "translation": "He runs quickly"
    },
    {
      "original": "Говори по-бързо",
      "transliteration": "Govori po-barzo",
      "translation": "Speak more quickly"
    },
    {
      "original": "Най-бързо от всички",
      "transliteration": "Nay-barzo ot vsichki",
      "translation": "Fastest of all"
    }
  ],
  "grammar": {
    "wordType": "adverb",
    "details": {
      "usage": {
        "original": "Модифицира глаголи, прилагателни или други наречия",
        "transliteration": "Modifitcira glagoli, prilagatelnI ili drugi narechiya",
        "translation": "Modifies verbs, adjectives or other adverbs"
      },
      "comparative": {
        "original": "по-бързо",
        "transliteration": "po-barzo",
        "translation": "more quickly"
      },
      "superlative": {
        "original": "най-бързо",
        "transliteration": "nay-barzo",
        "translation": "most quickly"
      }
    }
  },
  "exercises": [
    {
      "type": "multiple_choice",
      "question": {
        "original": "Как се образува сравнителната степен на 'бързо'?",
        "transliteration": "Kak se obrazuva sravnitelnata stepen na 'barzo'?",
        "translation": "How do you form the comparative of 'quickly'?"
      },
      "options": [
        {
          "original": "по-бързо",
          "transliteration": "po-barzo",
          "translation": "more quickly"
        },
        {
          "original": "най-бързо",
          "transliteration": "nay-barzo",
          "translation": "most quickly"
        },
        {
          "original": "бързо-бързо",
          "transliteration": "barzo-barzo",
          "translation": "quickly-quickly"
        },
        {
          "original": "много бързо",
          "transliteration": "mnogo barzo",
          "translation": "very quickly"
        }
      ],
      "correctAnswer": "по-бързо"
    },
    {
      "type": "fill_gap",
      "question": {
        "original": "Той работи _____ от всички",
        "transliteration": "Toy raboti _____ ot vsichki",
        "translation": "He works _____ than everyone"
      },
      "options": [
        {
          "original": "бързо",
          "transliteration": "barzo",
          "translation": "quickly"
        },
        {
          "original": "по-бързо",
          "transliteration": "po-barzo",
          "translation": "more quickly"
        },
        {
          "original": "най-бързо",
          "transliteration": "nay-barzo",
          "translation": "most quickly"
        },
        {
          "original": "много бързо",
          "transliteration": "mnogo barzo",
          "translation": "very quickly"
        }
      ],
      "correctAnswer": "по-бързо"
    }
  ]
}
```

### Spaced Repetition

**Simple algorithm:**
- New words: review in 1 day
- If rated "easy": multiply interval by 2.5
- If rated "medium": multiply interval by 2.0  
- If rated "hard": multiply interval by 1.3
- Minimum interval: 1 day
- Maximum interval: 90 days

## Exercise Types

1. **Multiple Choice**: Select correct translation from 4 options
2. **Fill in Gap**: Complete sentence with missing word
3. **Sentence Ordering**: Arrange words to form correct sentence
4. **Grammar Form**: Choose correct conjugation/declension/form from 4 options

## User Flow

1. **Start Session**: User selects language (Bulgarian/Hungarian)
2. **Get Next Word**: System picks random word due for review
3. **Generate Content**: LLM call (if not cached) to get word content
4. **Show Exercises**: Present 5-10 exercises from LLM response with full translations
5. **User Rating**: Easy/Medium/Hard after all exercises
6. **Update Schedule**: Adjust next review date based on rating
7. **Session Counter**: Show progress (X/10 words)
8. **Repeat**: Until user stops or completes 10 words

## Implementation Phases

### Phase 1: Core Structure
- Set up word lists (A1-A2 Bulgarian/Hungarian)
- Basic data models and storage
- Simple spaced repetition logic

### Phase 2: LLM Integration  
- OpenAI API integration
- Structured prompt design with grammar requirements
- Response parsing and validation for all word types

### Phase 3: Exercise System
- Implement 4 exercise types with full localization
- Basic UI for each exercise format (4 options for MC/grammar)
- User rating system

### Phase 4: Session Management
- Study session flow
- Progress tracking (10 words counter)
- Next word selection logic

## Technical Notes

- **No caching**: Generate content on-demand, fail if LLM unavailable
- **No user accounts**: Simple local storage for prototype
- **No performance optimization**: Keep it simple
- **No integration**: Completely separate from existing features
- **Error handling**: Basic - show error if LLM fails
- **Transliteration**: Required for all Bulgarian content, not needed for Hungarian
- **Exercise count**: 5-10 exercises per word
- **Multiple choice**: Always 4 options
- **Word types**: Verb, noun, adjective, adverb

## Success Criteria

- User can study Bulgarian/Hungarian words with full translations
- LLM generates structured grammar information for all word types
- 3 examples and 5-10 exercises per word
- Spaced repetition schedules words appropriately
- Session flow is intuitive with 10-word goal
- Exercise variety keeps users engaged
- All content is accessible to English speakers with transliterations
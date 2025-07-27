# Bulgarian Vocabulary Content Generator

Generate comprehensive learning content for a Bulgarian word in JSON format. The output must follow the exact structure and include transliterations for all Bulgarian text.

## Input
- **Word**: [Bulgarian word]
- **Word Type**: [verb|noun|adjective|adverb]
- **English Translation**: [English meaning]

## Required Output Structure

```json
{
  "wordId": "bg_XXX",
  "word": "[Bulgarian word]",
  "translation": "[English translation]",
  "transliteration": "[Latin script pronunciation]",
  "examples": [
    {
      "original": "[Bulgarian sentence]",
      "transliteration": "[Latin script]",
      "translation": "[English translation]"
    }
    // 3 examples total
  ],
  "grammar": {
    "wordType": "[verb|noun|adjective|adverb]",
    "details": {
      // See word-type specific sections below
    }
  },
  "exercises": [
    // 5 exercises total - mix of fill_gap and sentence_order types
  ]
}
```

## Word-Type Specific Grammar Details

### For Verbs
```json
"details": {
  "conjugations": {
    "present": {
      "I": {"original": "аз [verb]", "transliteration": "az [verb]", "translation": "I [verb]"},
      "you": {"original": "ти [verb]", "transliteration": "ti [verb]", "translation": "you [verb]"},
      "he": {"original": "той [verb]", "transliteration": "toy [verb]", "translation": "he [verb]"},
      "she": {"original": "тя [verb]", "transliteration": "tya [verb]", "translation": "she [verb]"},
      "it": {"original": "то [verb]", "transliteration": "to [verb]", "translation": "it [verb]"},
      "we": {"original": "ние [verb]", "transliteration": "nie [verb]", "translation": "we [verb]"},
      "they": {"original": "те [verb]", "transliteration": "te [verb]", "translation": "they [verb]"},
      "you_plural": {"original": "вие [verb]", "transliteration": "vie [verb]", "translation": "you [verb] (plural)"}
    },
    "past": {
      // Same structure with past tense forms
    },
    "future": {
      // Same structure with future tense forms (ще + verb)
    }
  }
}
```

### For Nouns
```json
"details": {
  "gender": "[masculine|feminine|neuter]",
  "articles": {
    "definite": {"original": "[noun]ът/та/то", "transliteration": "[transliteration]", "translation": "the [noun]"},
    "indefinite": {"original": "един/една/едно [noun]", "transliteration": "[transliteration]", "translation": "a [noun]"}
  },
  "plural": {"original": "[plural form]", "transliteration": "[transliteration]", "translation": "[plural translation]"},
  "definite_plural": {"original": "[plural]те", "transliteration": "[transliteration]", "translation": "the [plural]"}
}
```

### For Adjectives
```json
"details": {
  "genderForms": {
    "masculine": {"original": "[adj]", "transliteration": "[transliteration]", "translation": "[adj] (masculine)"},
    "feminine": {"original": "[adj]а", "transliteration": "[transliteration]", "translation": "[adj] (feminine)"},
    "neuter": {"original": "[adj]о", "transliteration": "[transliteration]", "translation": "[adj] (neuter)"},
    "plural": {"original": "[adj]и", "transliteration": "[transliteration]", "translation": "[adj] (plural)"}
  },
  "definiteForms": {
    "masculine": {"original": "[adj]ият", "transliteration": "[transliteration]", "translation": "the [adj] one (masculine)"},
    "feminine": {"original": "[adj]ата", "transliteration": "[transliteration]", "translation": "the [adj] one (feminine)"},
    "neuter": {"original": "[adj]ото", "transliteration": "[transliteration]", "translation": "the [adj] one (neuter)"},
    "plural": {"original": "[adj]ите", "transliteration": "[transliteration]", "translation": "the [adj] ones (plural)"}
  }
}
```

### For Adverbs
```json
"details": {
  "usage": {"original": "Модифицира глаголи, прилагателни или други наречия", "transliteration": "Modifitcira glagoli, prilagatelnI ili drugi narechiya", "translation": "Modifies verbs, adjectives or other adverbs"},
  "comparative": {"original": "по-[adverb]", "transliteration": "po-[adverb]", "translation": "more [adverb]"},
  "superlative": {"original": "най-[adverb]", "transliteration": "nay-[adverb]", "translation": "most [adverb]"}
}
```

## Exercise Requirements

Generate exactly 5 exercises using these types. **CRITICAL**: All exercises must test the TARGET WORD and its grammar forms, NOT general vocabulary.

### fill_gap (3-4 exercises)
Test the correct grammatical form of the target word in context:

```json
{
  "type": "fill_gap",
  "question": {
    "original": "[Bulgarian sentence with _____ where target word fits]",
    "transliteration": "[Latin script with _____]",
    "translation": "[English with _____]"
  },
  "options": [
    {"original": "[correct form of target word]", "transliteration": "[transliteration]", "translation": "[translation]"},
    {"original": "[wrong form of target word]", "transliteration": "[transliteration]", "translation": "[translation]"},
    {"original": "[wrong form of target word]", "transliteration": "[transliteration]", "translation": "[translation]"},
    {"original": "[wrong form of target word]", "transliteration": "[transliteration]", "translation": "[translation]"}
  ],
  "correctAnswer": "[correct form of target word]"
}
```

**Examples of GOOD fill_gap exercises:**
- For verb "съм": Test correct conjugation (съм vs си vs е vs са)
- For noun "къща": Test correct article/form (къщата vs една къща vs къщи vs къщите)  
- For adjective "красив": Test gender agreement (красив vs красива vs красиво vs красиви)
- For adverb "бързо": Test comparative forms (бързо vs по-бързо vs най-бързо)

**AVOID:**
- Testing vocabulary knowledge of different words
- Multiple choice about word meanings
- Questions where the answer is a completely different word

### sentence_order (1-2 exercises)
```json
{
  "type": "sentence_order",
  "question": {
    "original": "Подредете думите в правилен ред:",
    "transliteration": "Podredete dumite v pravilen red:",
    "translation": "Arrange the words in correct order:"
  },
  "options": [
    {"original": "[word1]", "transliteration": "[transliteration]", "translation": "[translation]"},
    {"original": "[word2]", "transliteration": "[transliteration]", "translation": "[translation]"},
    {"original": "[word3]", "transliteration": "[transliteration]", "translation": "[translation]"},
    {"original": "[word4]", "transliteration": "[transliteration]", "translation": "[translation]"}
  ],
  "correctAnswer": "[correct Bulgarian sentence]"
}
```

## Quality Requirements

1. **Accuracy**: All Bulgarian grammar must be correct
2. **Transliteration**: Use standard Latin script for all Bulgarian text
3. **Difficulty**: A1-A2 level vocabulary and sentence structures
4. **Variety**: Examples should show different contexts and uses
5. **Exercises**: Test different aspects (grammar agreement, usage, word order)
6. **Cultural Context**: Use realistic, culturally appropriate examples

## Example Usage
Input: Word="ходя", Word Type="verb", Translation="to go/walk"
Output: Complete JSON structure following the verb template with conjugations, examples, and exercises.

Generate the JSON now for the provided word.
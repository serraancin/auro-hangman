from flask import Flask, render_template, jsonify, request, session
import random
import hashlib
import json
from datetime import date, datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from services.claude_client import ClaudeClient, ClaudeClientError

app = Flask(__name__)
app.secret_key = 'supersecretkey'  # Required for session management

# Difficulty settings
DIFFICULTY_SETTINGS = {
    'easy': {
        'attempts': 8,
        'word_length': (3, 6),  # 3-6 letters
        'ai_hint_cost': 0,  # Free hints
    },
    'medium': {
        'attempts': 6,
        'word_length': (5, 10),  # 5-10 letters
        'ai_hint_cost': 0,  # Free hints
    },
    'hard': {
        'attempts': 4,
        'word_length': (8, 20),  # 8+ letters
        'ai_hint_cost': 1,  # Costs 1 attempt
    }
}

BASE_CATEGORIES = {
    "Technology": [
        {"word": "PYTHON", "hint": "A popular programming language named after a snake"},
        {"word": "FLASK", "hint": "A micro web framework written in Python"},
        {"word": "DEVELOPER", "hint": "Someone who writes code"},
        {"word": "HANGMAN", "hint": "The name of this game"},
        {"word": "CODING", "hint": "The act of writing computer programs"},
        {"word": "ALGORITHM", "hint": "A step-by-step procedure for calculations"},
        {"word": "DATABASE", "hint": "An organized collection of structured information"},
        {"word": "SERVER", "hint": "Provides functionality for other programs or devices"},
        {"word": "BROWSER", "hint": "Application for accessing the World Wide Web"},
        {"word": "VARIABLE", "hint": "A container for storing data values"},
        {"word": "INTERNET", "hint": "Global network of computers"},
        {"word": "KEYBOARD", "hint": "Input device with keys"},
        {"word": "MONITOR", "hint": "Output device that displays video"},
        {"word": "SOFTWARE", "hint": "Instructions that tell a computer what to do"},
        {"word": "HARDWARE", "hint": "Physical parts of a computer"},
        {"word": "JAVASCRIPT", "hint": "Language of the web"},
        {"word": "COMPILER", "hint": "Translates code into machine language"},
        {"word": "ENCRYPTION", "hint": "Scrambling data for security"},
        {"word": "FIREWALL", "hint": "Network security system"},
        {"word": "ROBOTICS", "hint": "Branch of technology dealing with robots"},
        {"word": "ARTIFICIAL INTELLIGENCE", "hint": "Simulation of human intelligence by machines"},
        {"word": "CLOUD COMPUTING", "hint": "Delivery of computing services over the internet"},
        {"word": "DEBUGGING", "hint": "Finding and fixing errors in code"},
        {"word": "PIXEL", "hint": "Smallest unit of a digital image"},
        {"word": "BANDWIDTH", "hint": "Maximum data transfer rate of a network"},
        {"word": "CACHE", "hint": "Hardware or software component that stores data"},
        {"word": "LINUX", "hint": "Open source operating system"},
        {"word": "WINDOWS", "hint": "Operating system developed by Microsoft"},
        {"word": "APPLE", "hint": "Tech company known for iPhones and Macs"}
    ],
    "Animals": [
        {"word": "ELEPHANT", "hint": "The largest land animal"},
        {"word": "GIRAFFE", "hint": "Has a very long neck"},
        {"word": "PENGUIN", "hint": "A flightless bird that lives in the cold"},
        {"word": "DOLPHIN", "hint": "A highly intelligent marine mammal"},
        {"word": "KANGAROO", "hint": "A marsupial from Australia that hops"},
        {"word": "LION", "hint": "The king of the jungle"},
        {"word": "ZEBRA", "hint": "A horse-like animal with black and white stripes"},
        {"word": "OCTOPUS", "hint": "A sea creature with eight arms"},
        {"word": "SQUIRREL", "hint": "Small rodent with a bushy tail"},
        {"word": "CHAMELEON", "hint": "Lizard known for changing colors"},
        {"word": "CHEETAH", "hint": "Fastest land animal"},
        {"word": "WHALE", "hint": "Largest marine mammal"},
        {"word": "EAGLE", "hint": "Large bird of prey"},
        {"word": "SHARK", "hint": "Predatory fish with cartilage skeleton"},
        {"word": "PANDA", "hint": "Bear native to China that eats bamboo"},
        {"word": "KOALA", "hint": "Australian marsupial that eats eucalyptus"},
        {"word": "GORILLA", "hint": "Largest living primate"},
        {"word": "WOLF", "hint": "Wild dog that travels in packs"},
        {"word": "TIGER", "hint": "Largest cat species"},
        {"word": "POLAR BEAR", "hint": "White bear from the Arctic"},
        {"word": "RHINOCEROS", "hint": "Large herbivore with a horn on its nose"},
        {"word": "HIPPOPOTAMUS", "hint": "Large semi-aquatic mammal from Africa"},
        {"word": "CROCODILE", "hint": "Large aquatic reptile"},
        {"word": "FLAMINGO", "hint": "Pink wading bird"},
        {"word": "OWL", "hint": "Nocturnal bird of prey"},
        {"word": "BUTTERFLY", "hint": "Insect with colorful wings"},
        {"word": "TURTLE", "hint": "Reptile with a shell"},
        {"word": "SLOTH", "hint": "Slow-moving tropical mammal"},
        {"word": "OTTER", "hint": "Playful semi-aquatic mammal"}
    ],
    "Fruits": [
        {"word": "BANANA", "hint": "A long curved yellow fruit"},
        {"word": "STRAWBERRY", "hint": "Red fruit with seeds on the outside"},
        {"word": "PINEAPPLE", "hint": "Tropical fruit with spiky skin"},
        {"word": "WATERMELON", "hint": "Large green fruit with red flesh"},
        {"word": "ORANGE", "hint": "A citrus fruit that shares its name with a color"},
        {"word": "GRAPES", "hint": "Small round fruit used to make wine"},
        {"word": "MANGO", "hint": "Tropical stone fruit with sweet yellow flesh"},
        {"word": "AVOCADO", "hint": "Green fruit with a large pit, used in guacamole"},
        {"word": "BLUEBERRY", "hint": "Small blue round berry"},
        {"word": "KIWI", "hint": "Small brown fuzzy fruit with green flesh"},
        {"word": "APPLE", "hint": "Common round fruit, red or green"},
        {"word": "PEAR", "hint": "Sweet fruit with a narrow top and wide bottom"},
        {"word": "CHERRY", "hint": "Small red stone fruit"},
        {"word": "LEMON", "hint": "Sour yellow citrus fruit"},
        {"word": "LIME", "hint": "Sour green citrus fruit"},
        {"word": "PEACH", "hint": "Soft fuzzy fruit with a stone"},
        {"word": "PLUM", "hint": "Purple fruit with a stone"},
        {"word": "RASPBERRY", "hint": "Red aggregate fruit"},
        {"word": "BLACKBERRY", "hint": "Dark purple aggregate fruit"},
        {"word": "COCONUT", "hint": "Large seed with hard shell and white meat"},
        {"word": "PAPAYA", "hint": "Tropical fruit with orange flesh and black seeds"},
        {"word": "POMEGRANATE", "hint": "Fruit with many red juicy seeds"},
        {"word": "DRAGONFRUIT", "hint": "Cactus fruit with pink skin and scales"},
        {"word": "FIG", "hint": "Sweet fruit with many tiny seeds"},
        {"word": "GUAVA", "hint": "Tropical fruit with pink or white flesh"},
        {"word": "APRICOT", "hint": "Small orange fruit similar to a peach"},
        {"word": "CANTALOUPE", "hint": "Melon with orange flesh"},
        {"word": "GRAPEFRUIT", "hint": "Large sour citrus fruit"},
        {"word": "LYCHEE", "hint": "Small fruit with rough red skin and white flesh"}
    ],
    "Countries": [
        {"word": "FRANCE", "hint": "Home to the Eiffel Tower"},
        {"word": "JAPAN", "hint": "Island nation known for sushi and anime"},
        {"word": "BRAZIL", "hint": "Largest country in South America"},
        {"word": "EGYPT", "hint": "Famous for pyramids and pharaohs"},
        {"word": "AUSTRALIA", "hint": "Country and continent known for the Outback"},
        {"word": "CANADA", "hint": "North American country known for maple syrup"},
        {"word": "ITALY", "hint": "Boot-shaped country famous for pizza and pasta"},
        {"word": "INDIA", "hint": "South Asian country with the Taj Mahal"},
        {"word": "GERMANY", "hint": "European country known for Oktoberfest"},
        {"word": "MEXICO", "hint": "North American country known for tacos and mariachi"},
        {"word": "CHINA", "hint": "Most populous country in Asia"},
        {"word": "UNITED STATES", "hint": "Country with 50 states"},
        {"word": "UNITED KINGDOM", "hint": "Island nation in Europe"},
        {"word": "RUSSIA", "hint": "Largest country by land area"},
        {"word": "SPAIN", "hint": "European country known for bullfighting"},
        {"word": "ARGENTINA", "hint": "South American country famous for tango"},
        {"word": "SOUTH AFRICA", "hint": "Country at the southern tip of Africa"},
        {"word": "THAILAND", "hint": "Southeast Asian country known for beaches and temples"},
        {"word": "VIETNAM", "hint": "Southeast Asian country known for pho"},
        {"word": "GREECE", "hint": "Cradle of Western civilization"},
        {"word": "TURKEY", "hint": "Country bridging Europe and Asia"},
        {"word": "SWEDEN", "hint": "Scandinavian country known for IKEA"},
        {"word": "NORWAY", "hint": "Scandinavian country known for fjords"},
        {"word": "SWITZERLAND", "hint": "Neutral country known for watches and chocolate"},
        {"word": "NETHERLANDS", "hint": "Country known for tulips and windmills"},
        {"word": "PERU", "hint": "Home to Machu Picchu"},
        {"word": "NEW ZEALAND", "hint": "Island nation near Australia"},
        {"word": "IRELAND", "hint": "The Emerald Isle"},
        {"word": "PORTUGAL", "hint": "Country on the Iberian Peninsula"}
    ]
}

BASE_DIR = Path(__file__).resolve().parent
CURRICULUM_PATH = BASE_DIR / "data" / "curriculum_words.json"
CATEGORY_METADATA = {}


def _copy_base_categories():
    categories = {}
    for name, words in BASE_CATEGORIES.items():
        CATEGORY_METADATA[name] = {
            "subject": "General Knowledge",
            "grade_band": "K-8",
            "standard": None,
            "description": f"Fun vocabulary about {name.lower()}",
        }
        categories[name] = [dict(word) for word in words]
    return categories


def load_curriculum_categories():
    categories = _copy_base_categories()

    if not CURRICULUM_PATH.exists():
        return categories

    try:
        payload = json.loads(CURRICULUM_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"Failed to load curriculum categories: {exc}")
        return categories

    for cat in payload.get("categories", []):
        name = (cat.get("name") or "").strip()
        if not name:
            continue

        words = []
        for entry in cat.get("words", []):
            normalized_word = (entry.get("word") or "").strip().upper()
            if not normalized_word:
                continue

            word_record = {
                "word": normalized_word,
                "hint": entry.get("hint") or entry.get("definition") or "",
            }

            for field in ("definition", "fun_fact", "essential_question"):
                value = entry.get(field)
                if value:
                    word_record[field] = value

            # Attach category-level metadata so every word knows its context
            for field, value in (
                ("subject", cat.get("subject")),
                ("grade_band", cat.get("grade_band")),
                ("standard", cat.get("standard")),
                ("description", cat.get("description")),
            ):
                if value:
                    word_record[field] = value

            words.append(word_record)

        if words:
            categories[name] = words
            CATEGORY_METADATA[name] = {
                "subject": cat.get("subject"),
                "grade_band": cat.get("grade_band"),
                "standard": cat.get("standard"),
                "description": cat.get("description"),
            }

    return categories


def _lookup_word_entry(category, word):
    for entry in CATEGORIES.get(category, []):
        if entry.get("word") == word:
            return entry
    return {"word": word, "hint": ""}


def generate_learning_info_with_ai(word, category):
    """Generate definition and fun fact using Claude AI."""
    try:
        client = ClaudeClient()
        
        prompt = f"""CRITICAL: Create educational content about the EXACT word "{word}" ONLY.

THE WORD IS: {word}
Category: {category}

Generate factually accurate educational content about "{word}" and ONLY "{word}".
If the word is "{word}", all content must be exclusively about "{word}".

Respond in this exact format:

DEFINITION: [Write a clear, age-appropriate definition of "{word}" in one sentence]

FUN_FACT: [Write an interesting, educational fun fact about "{word}" in one sentence]

Double-check your content is about "{word}" before responding."""
        
        response = client.generate_text(
            prompt=prompt,
            max_tokens=150,
            temperature=0.4,
            system=f"CRITICAL: Generate accurate content exclusively about '{word}'. Verify your response is about '{word}' and not any other word. Be factually correct."
        )
        
        # Parse the response
        definition = ""
        fun_fact = ""
        
        lines = response.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('DEFINITION:'):
                definition = line.replace('DEFINITION:', '').strip()
            elif line.startswith('FUN_FACT:'):
                fun_fact = line.replace('FUN_FACT:', '').strip()
        
        return {
            'definition': definition,
            'fun_fact': fun_fact
        }
        
    except Exception as e:
        print(f"Failed to generate learning info with AI: {e}")
        # Fallback to generic content
        return {
            'definition': f"A word from the {category} category.",
            'fun_fact': f"This word is part of the {category} vocabulary."
        }


def build_learning_info(word_data, category_name):
    if not word_data:
        return None

    word = word_data.get("word", "")
    
    # Generate definition and fun_fact using AI
    ai_content = generate_learning_info_with_ai(word, category_name)

    info = {"category": category_name}
    
    # Use AI-generated content
    info["definition"] = ai_content.get("definition", "")
    info["fun_fact"] = ai_content.get("fun_fact", "")
    
    # Keep other metadata from word_data or category defaults
    fields = [
        "subject",
        "grade_band",
        "standard",
        "description",
        "essential_question",
    ]

    category_defaults = CATEGORY_METADATA.get(category_name, {})
    for field in fields:
        value = word_data.get(field) or category_defaults.get(field)
        if value:
            info[field] = value

    info["hint"] = word_data.get("hint")
    return info


CATEGORIES = load_curriculum_categories()


def _ensure_session_learning_info(category, word):
    info = session.get('learning_info')
    if info:
        return info
    entry = _lookup_word_entry(category, word)
    info = build_learning_info(entry, category)
    session['learning_info'] = info
    return info

def get_masked_word(word, guesses):
    return " ".join([letter if letter in guesses else "_" for letter in word])


def _today_str() -> str:
    return date.today().isoformat()


def _yesterday_str() -> str:
    return (date.today() - timedelta(days=1)).isoformat()


def _daily_word_for(category: str, day_str: str):
    words = CATEGORIES.get(category) or CATEGORIES["Technology"]
    seed = f"{day_str}|{category}".encode("utf-8")
    idx = int(hashlib.sha256(seed).hexdigest(), 16) % len(words)
    return words[idx]


def _get_daily_state():
    return session.get("daily_state", {})


def _set_daily_state(state):
    session["daily_state"] = state


def _get_streaks():
    return session.get("daily_streaks", {})


def _set_streaks(streaks):
    session["daily_streaks"] = streaks


def _ensure_daily_game(category: str):
    day_str = _today_str()
    category = category if category in CATEGORIES else "Technology"

    daily_state = _get_daily_state()
    current = daily_state.get(category)

    # Start a new daily game if none exists for today.
    if not current or current.get("date") != day_str:
        word_data = _daily_word_for(category, day_str)
        learning_info = build_learning_info(word_data, category)
        daily_state[category] = {
            "date": day_str,
            "category": category,
            "word": word_data["word"],
            "hint": word_data["hint"],
            "guesses": [],
            "attempts_left": 6,
            "game_over": False,
            "win": False,
            "started_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "learning": learning_info,
        }
        _set_daily_state(daily_state)

    refreshed = _get_daily_state()[category]

    # Backfill learning info for games that started before curriculum data existed
    if not refreshed.get("learning"):
        word_entry = _lookup_word_entry(category, refreshed.get("word"))
        refreshed["learning"] = build_learning_info(word_entry, category)
        daily_state[category] = refreshed
        _set_daily_state(daily_state)

    return refreshed


def _update_streak_if_finished(category: str, win: bool, attempts_left: int, guesses):
    # Only update streak once per day/category.
    day_str = _today_str()
    streaks = _get_streaks()
    cat = streaks.get(category, {"current": 0, "best": 0, "last_date": None, "last_outcome": None})

    if cat.get("last_date") == day_str:
        return

    if win:
        if cat.get("last_date") == _yesterday_str() and cat.get("last_outcome") == "win":
            cat["current"] = int(cat.get("current", 0)) + 1
        else:
            cat["current"] = 1
        cat["best"] = max(int(cat.get("best", 0)), int(cat.get("current", 0)))
        cat["last_outcome"] = "win"
    else:
        # Losing breaks the streak.
        cat["current"] = 0
        cat["last_outcome"] = "lose"

    cat["last_date"] = day_str
    cat["last_attempts_left"] = attempts_left
    cat["last_guess_count"] = len(guesses or [])

    streaks[category] = cat
    _set_streaks(streaks)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/start', methods=['POST'])
def start_game():
    data = request.json or {}
    category = data.get('category', 'Technology')
    difficulty = data.get('difficulty', 'medium')
    
    if category not in CATEGORIES:
        category = 'Technology'
    
    if difficulty not in DIFFICULTY_SETTINGS:
        difficulty = 'medium'
        
    # Get difficulty settings
    diff_settings = DIFFICULTY_SETTINGS[difficulty]
    min_len, max_len = diff_settings['word_length']
    attempts = diff_settings['attempts']
    
    # Filter words by difficulty (word length)
    available_words = CATEGORIES[category]
    filtered_words = [w for w in available_words if min_len <= len(w["word"].replace(' ', '')) <= max_len]
    
    # Fallback to all words if no matches
    if not filtered_words:
        filtered_words = available_words
    
    previous_word = session.get('word')
    
    # Filter out the previous word to avoid immediate repetition
    if previous_word and len(filtered_words) > 1:
        candidates = [w for w in filtered_words if w["word"] != previous_word]
        if candidates:
            word_data = random.choice(candidates)
        else:
            word_data = random.choice(filtered_words)
    else:
        word_data = random.choice(filtered_words)

    word = word_data["word"]
    hint = word_data["hint"]
    learning_info = build_learning_info(word_data, category)
    session['word'] = word
    session['hint'] = hint
    session['category'] = category
    session['difficulty'] = difficulty
    session['guesses'] = []
    session['attempts_left'] = attempts
    session['game_over'] = False
    session['win'] = False
    session['learning_info'] = learning_info
    session['ai_hints_used'] = 0
    session['mode'] = 'random'  # Set mode to random
    
    # Clear daily-specific session data
    session.pop('daily_word', None)
    session.pop('daily_date', None)
    
    return jsonify({
        "mode": "random",
        "category": category,
        "difficulty": difficulty,
        "masked_word": get_masked_word(word, []),
        "attempts_left": attempts,
        "max_attempts": attempts,
        "guesses": [],
        "game_over": False,
        "win": False,
        "hint": hint,
        "category": category,
        "learning": learning_info,
    })

@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify(list(CATEGORIES.keys()))


@app.route('/api/daily/start', methods=['POST'])
def daily_start():
    data = request.json or {}
    category = data.get("category", "Technology")
    game = _ensure_daily_game(category)

    # Set session mode to daily
    session['mode'] = 'daily'
    session['category'] = category

    streaks = _get_streaks().get(game["category"], {"current": 0, "best": 0})
    response = {
        "mode": "daily",
        "date": game["date"],
        "category": game["category"],
        "masked_word": get_masked_word(game["word"], game["guesses"]),
        "attempts_left": game["attempts_left"],
        "guesses": game["guesses"],
        "game_over": game["game_over"],
        "win": game["win"],
        "hint": game["hint"],
        "learning": game.get("learning"),
        "streak_current": streaks.get("current", 0),
        "streak_best": streaks.get("best", 0),
    }
    if game["game_over"]:
        response["word"] = game["word"]
    return jsonify(response)


@app.route('/api/daily/status', methods=['GET'])
def daily_status():
    category = request.args.get("category", "Technology")
    game = _ensure_daily_game(category)
    streaks = _get_streaks().get(game["category"], {"current": 0, "best": 0})

    response = {
        "mode": "daily",
        "date": game["date"],
        "category": game["category"],
        "masked_word": get_masked_word(game["word"], game["guesses"]),
        "attempts_left": game["attempts_left"],
        "guesses": game["guesses"],
        "game_over": game["game_over"],
        "win": game["win"],
        "hint": game["hint"],
        "learning": game.get("learning"),
        "streak_current": streaks.get("current", 0),
        "streak_best": streaks.get("best", 0),
    }
    if game["game_over"]:
        response["word"] = game["word"]
    return jsonify(response)


@app.route('/api/daily/guess', methods=['POST'])
def daily_guess():
    data = request.json or {}
    category = data.get("category", session.get("category", "Technology"))
    letter = (data.get('letter', '') or '').upper()

    if not letter or len(letter) != 1 or not letter.isalpha():
        return jsonify({"error": "Invalid input"}), 400

    game = _ensure_daily_game(category)
    if game.get("game_over"):
        return jsonify({"error": "Daily challenge is already finished"}), 400

    guesses = list(game.get("guesses", []))
    word = game.get("word")
    attempts_left = int(game.get("attempts_left", 6))

    if letter in guesses:
        return jsonify({"error": "Already guessed"}), 400

    guesses.append(letter)

    if letter not in word:
        attempts_left -= 1

    masked_word = get_masked_word(word, guesses)
    win = "_" not in masked_word
    game_over = win or attempts_left <= 0

    # Persist back into session state.
    daily_state = _get_daily_state()
    daily_state[game["category"]] = {
        **game,
        "guesses": guesses,
        "attempts_left": attempts_left,
        "game_over": game_over,
        "win": win,
    }
    _set_daily_state(daily_state)

    if game_over:
        _update_streak_if_finished(game["category"], win=win, attempts_left=attempts_left, guesses=guesses)

    streaks = _get_streaks().get(game["category"], {"current": 0, "best": 0})
    response = {
        "mode": "daily",
        "date": _today_str(),
        "category": game["category"],
        "masked_word": masked_word,
        "attempts_left": attempts_left,
        "guesses": guesses,
        "game_over": game_over,
        "win": win,
        "hint": game.get("hint", ""),
        "learning": game.get("learning"),
        "streak_current": streaks.get("current", 0),
        "streak_best": streaks.get("best", 0),
    }

    if game_over:
        response["word"] = word

    return jsonify(response)

@app.route('/api/guess', methods=['POST'])
def guess_letter():
    if 'word' not in session:
        return jsonify({"error": "Game not started"}), 400
        
    if session.get('game_over'):
        return jsonify({"error": "Game is over"}), 400

    data = request.json
    letter = data.get('letter', '').upper()
    
    if not letter or len(letter) != 1 or not letter.isalpha():
        return jsonify({"error": "Invalid input"}), 400
        
    guesses = session.get('guesses', [])
    word = session.get('word')
    attempts_left = session.get('attempts_left')
    
    if letter in guesses:
        return jsonify({"error": "Already guessed"}), 400
        
    guesses.append(letter)
    session['guesses'] = guesses
    
    if letter not in word:
        attempts_left -= 1
        session['attempts_left'] = attempts_left
        
    masked_word = get_masked_word(word, guesses)
    
    win = "_" not in masked_word
    game_over = win or attempts_left <= 0
    
    session['game_over'] = game_over
    session['win'] = win
    
    category_name = session.get("category", "Technology")
    learning_info = _ensure_session_learning_info(category_name, word)

    response = {
        "mode": "random",
        "category": category_name,
        "masked_word": masked_word,
        "attempts_left": attempts_left,
        "guesses": guesses,
        "game_over": game_over,
        "win": win,
        "hint": session.get('hint', ''),
        "learning": learning_info,
    }
    
    if game_over:
        response["word"] = word  # Reveal the word
        
    return jsonify(response)

@app.route('/api/status', methods=['GET'])
def get_status():
    if 'word' not in session:
        return start_game()
        
    word = session.get('word')
    hint = session.get('hint', '')
    guesses = session.get('guesses', [])
    attempts_left = session.get('attempts_left')
    game_over = session.get('game_over')
    win = session.get('win')
    
    category_name = session.get("category", "Technology")
    learning_info = _ensure_session_learning_info(category_name, word)

    response = {
        "mode": "random",
        "category": category_name,
        "masked_word": get_masked_word(word, guesses),
        "attempts_left": attempts_left,
        "guesses": guesses,
        "game_over": game_over,
        "win": win,
        "hint": hint,
        "learning": learning_info,
    }
    
    if game_over:
        response["word"] = word
        
    return jsonify(response)


@app.route('/api/ai-hint', methods=['POST'])
def generate_ai_hint():
    """Generate a dynamic, engaging hint using Claude AI."""
    if 'word' not in session:
        return jsonify({'error': 'No game in progress'}), 400
    
    word = session['word']
    category = session.get('category', 'Unknown')
    guesses = session.get('guesses', [])
    masked_word = get_masked_word(word, guesses)
    attempts_left = session.get('attempts_left', 6)
    
    try:
        client = ClaudeClient()
        
        # Build a contextual prompt
        prompt = f"""CRITICAL: You must give a hint about the EXACT word "{word}". Do not confuse it with other words.

THE WORD IS: {word}
Category: {category}
Current progress: {masked_word}

Provide a factually accurate hint that uniquely describes "{word}" and ONLY "{word}". 
If the word is "{word}", your hint must be specifically about "{word}".
Maximum 12 words. Start directly with the hint - no preambles."""
        
        hint = client.generate_text(
            prompt=prompt,
            max_tokens=80,
            temperature=0.3,
            system=f"CRITICAL INSTRUCTION: Give a hint specifically and exclusively about the word '{word}'. Double-check your hint is about '{word}' and not any other word. Be factually accurate. No preambles."
        )
        
        return jsonify({'hint': hint, 'success': True})
        
    except ClaudeClientError as e:
        return jsonify({'error': f'AI hint generation failed: {str(e)}', 'success': False}), 500
    except ValueError as e:
        return jsonify({'error': 'Claude API not configured', 'success': False}), 503
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}', 'success': False}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5050, use_reloader=True)

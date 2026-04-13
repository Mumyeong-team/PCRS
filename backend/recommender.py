"""
recommender.py
==============
체형 분류 결과를 바탕으로 스타일을 추천하는 모듈.

추천 데이터는 STYLE_RULES 딕셔너리로 관리합니다.
  - 새 체형/성별을 추가할 때는 이 딕셔너리만 수정하면 됩니다.
  - rule-based 엔진이므로 GPT API 없이 동작합니다.
  - 나중에 GPT API를 붙이려면 recommend_style()의 반환값을
    프롬프트 컨텍스트로 넘기면 됩니다.

[hip_width 추가 시]
  STYLE_RULES에 "triangle" / "hourglass" / "round" 키를 추가하고,
  classify_body()가 해당 레이블을 반환하면 자동으로 매핑됩니다.

딕셔너리 구조:
  STYLE_RULES[gender][body_type][proportion]
  proportion 키가 없는 체형은 "default" 하나만 작성합니다.
  proportion별 세부 규칙이 있으면 별도 키로 추가합니다.
"""


# ────────────────────────────────────────────────
# 스타일 규칙 딕셔너리
# ────────────────────────────────────────────────

STYLE_RULES: dict = {

    # ── MALE ──────────────────────────────────────
    "male": {
        "inverted_triangle": {
            # proportion 구분 없이 공통 적용
            "default": {
                "top"      : ["슬림핏 기본 티셔츠", "V넥 니트", "어두운 톤 단색 상의"],
                "bottom"   : ["와이드 팬츠", "카고 팬츠", "밝은 색 하의"],
                "fit"      : "하체에 볼륨감을 주어 상하체 균형을 맞춥니다",
                "avoid"    : ["어깨 패드 재킷", "러플·프릴 상의", "밝은 색 상의"],
                "extra_tip": (
                    "상체가 넓어 보이는 아이템은 피하고, "
                    "밝은 색·볼륨감 있는 하의로 시선을 아래로 분산시키세요."
                ),
            },
            # 다리가 긴 경우: 하의 선택 폭을 더 강조
            "long_legs": {
                "top"      : ["슬림핏 단색 상의", "터틀넥", "어두운 톤 상의"],
                "bottom"   : ["와이드 팬츠", "배기 팬츠", "밝은 색 하이웨이스트 팬츠"],
                "fit"      : "긴 다리를 살리면서 하체에 볼륨을 더해 균형을 맞춥니다",
                "avoid"    : ["어깨 강조 디테일", "숏 팬츠", "스키니 팬츠"],
                "extra_tip": (
                    "하이웨이스트 팬츠로 다리 라인을 더 살리고, "
                    "상의는 심플하게 유지해 시선이 하체로 향하게 하세요."
                ),
            },
        },

        "rectangle": {
            "default": {
                "top"      : ["레이어드 룩 아우터", "체크 셔츠", "포켓 디테일 상의"],
                "bottom"   : ["슬림핏 청바지", "테이퍼드 팬츠"],
                "fit"      : "레이어링으로 상체에 입체감을 추가합니다",
                "avoid"    : ["몸에 너무 딱 붙는 올인원", "밋밋한 단색 단품 코디"],
                "extra_tip": (
                    "레이어드와 텍스처 소재로 입체감을 만들면 "
                    "균일한 체형에 자연스러운 포인트가 생깁니다."
                ),
            },
            # 다리가 긴 경우
            "long_legs": {
                "top"      : ["오버핏 셔츠", "레이어드 후드티", "롱 재킷"],
                "bottom"   : ["스트레이트 팬츠", "슬림 청바지"],
                "fit"      : "긴 다리 비율을 살리면서 상체에 볼륨을 더합니다",
                "avoid"    : ["짧은 상의 단독 착용", "크롭 기장"],
                "extra_tip": (
                    "상체를 풍성하게 연출하면 긴 다리와 균형이 잘 맞습니다."
                ),
            },
        },

        "balanced": {
            "default": {
                "top"      : ["다양한 핏의 상의 자유롭게 활용"],
                "bottom"   : ["스트레이트 핏 팬츠", "슬림 팬츠"],
                "fit"      : "균형 잡힌 체형이므로 대부분의 스타일이 잘 어울립니다",
                "avoid"    : ["극단적인 오버핏과 슬림핏의 혼용"],
                "extra_tip": "비율이 좋으니 트렌드 아이템을 부담 없이 시도해보세요.",
            },
            # 다리가 긴 경우: 장점을 더 살리는 방향
            "long_legs": {
                "top"      : ["크롭 기장 상의", "짧은 재킷", "볼드한 프린트 상의"],
                "bottom"   : ["하이웨이스트 팬츠", "부츠컷 팬츠"],
                "fit"      : "긴 다리 비율을 적극 활용하는 스타일링",
                "avoid"    : ["무릎 아래까지 내려오는 긴 상의"],
                "extra_tip": (
                    "다리 라인이 길어 보이는 장점이 있습니다. "
                    "하이웨이스트 아이템으로 이 비율을 더욱 강조해보세요."
                ),
            },
        },
    },

    # ── FEMALE ────────────────────────────────────
    "female": {
        "inverted_triangle": {
            "default": {
                "top"      : ["슬림핏 블라우스", "V넥 탑", "단색 심플 상의"],
                "bottom"   : ["A라인 스커트", "플리츠 스커트", "와이드 팬츠", "플레어 팬츠"],
                "fit"      : "하체에 볼륨감을 주어 여성스러운 실루엣을 강조합니다",
                "avoid"    : ["퍼프 슬리브 상의", "오프숄더", "보트넥"],
                "extra_tip": (
                    "어깨를 강조하는 디테일은 피하고, "
                    "스커트나 플레어 팬츠로 하체에 볼륨을 더하세요."
                ),
            },
            "long_legs": {
                "top"      : ["슬림핏 단색 블라우스", "터틀넥 니트"],
                "bottom"   : ["미디 플레어 스커트", "와이드 팬츠", "팔라초 팬츠"],
                "fit"      : "긴 다리를 살리면서 하체 볼륨으로 전체 균형을 맞춥니다",
                "avoid"    : ["미니 스커트", "스키니 팬츠", "어깨 강조 디테일"],
                "extra_tip": (
                    "미디 기장 스커트가 긴 다리와 어울려 우아한 분위기를 연출합니다."
                ),
            },
        },

        "rectangle": {
            "default": {
                "top"      : ["러플 블라우스", "크롭 탑", "벨트 활용 상의"],
                "bottom"   : ["하이웨이스트 팬츠", "미디 스커트"],
                "fit"      : "허리 라인을 강조해 곡선미를 연출합니다",
                "avoid"    : ["허리 없는 박스핏 원피스", "루즈한 일자형 실루엣"],
                "extra_tip": (
                    "벨트나 터킹으로 허리 라인을 만들어주면 "
                    "전체 실루엣이 한층 살아납니다."
                ),
            },
            "long_legs": {
                "top"      : ["크롭 블라우스", "숏 재킷", "볼드 프린트 상의"],
                "bottom"   : ["하이웨이스트 와이드 팬츠", "미디 랩 스커트"],
                "fit"      : "긴 다리를 활용해 하이웨이스트 스타일로 허리 라인을 강조합니다",
                "avoid"    : ["로우웨이스트 팬츠", "기장 긴 상의"],
                "extra_tip": (
                    "다리 라인이 잘 살아납니다. "
                    "하이웨이스트 아이템과 크롭 기장을 활용하면 비율이 더욱 돋보입니다."
                ),
            },
        },

        "balanced": {
            "default": {
                "top"      : ["다양한 핏의 상의 자유롭게 활용"],
                "bottom"   : ["스트레이트 핏 팬츠", "미디 스커트"],
                "fit"      : "균형 잡힌 체형이므로 대부분의 스타일이 잘 어울립니다",
                "avoid"    : ["극단적인 오버핏과 슬림핏의 혼용"],
                "extra_tip": "비율이 좋으니 트렌드 아이템을 부담 없이 시도해보세요.",
            },
            "long_legs": {
                "top"      : ["크롭 니트", "숏 재킷", "타이트 블라우스"],
                "bottom"   : ["하이웨이스트 팬츠", "미디 플리츠 스커트"],
                "fit"      : "긴 다리 비율을 적극적으로 활용하는 스타일링",
                "avoid"    : ["무릎 아래까지 내려오는 긴 상의"],
                "extra_tip": (
                    "다리 라인이 길어 보이는 장점이 있습니다. "
                    "하이웨이스트 아이템으로 이 비율을 더욱 강조해보세요."
                ),
            },
        },
    },

    # ── UNSPECIFIED (성별 미지정) ─────────────────
    "unspecified": {
        "inverted_triangle": {
            "default": {
                "top"      : ["슬림핏 단색 상의", "V넥 상의"],
                "bottom"   : ["와이드 팬츠", "볼륨감 있는 하의"],
                "fit"      : "하체에 시선을 분산시키는 스타일",
                "avoid"    : ["어깨 강조 디테일", "밝은 색 상의"],
                "extra_tip": "상체보다 하체에 볼륨을 주는 방향으로 코디하세요.",
            },
        },
        "rectangle": {
            "default": {
                "top"      : ["레이어드 아우터", "디테일 있는 상의"],
                "bottom"   : ["슬림 또는 테이퍼드 팬츠"],
                "fit"      : "레이어링으로 입체감을 추가합니다",
                "avoid"    : ["밋밋한 단품 단색 코디"],
                "extra_tip": "레이어드와 액세서리로 포인트를 주세요.",
            },
        },
        "balanced": {
            "default": {
                "top"      : ["자유롭게 선택"],
                "bottom"   : ["자유롭게 선택"],
                "fit"      : "대부분의 스타일이 잘 어울립니다",
                "avoid"    : [],
                "extra_tip": "트렌드에 맞게 다양하게 시도해보세요.",
            },
        },
    },
}


# ── 비율별 추가 팁 (proportion) ───────────────────
# 성별에 무관하게 공통으로 적용되는 중립적인 문구입니다.
PROPORTION_TIPS: dict = {
    "long_upper_body": (
        "상체가 길어 보일 수 있으니, "
        "하이웨이스트 아이템으로 허리 위치를 시각적으로 높여보세요."
    ),
    "long_legs": (
        "하체 비율이 길어 비례감이 좋습니다. "
        "하이웨이스트 아이템으로 이 장점을 더욱 살릴 수 있습니다."
    ),
    "balanced_proportion": (
        "상하체 비율이 균형 잡혀 있어 다양한 기장과 핏을 자유롭게 활용할 수 있습니다."
    ),
}

# ── 팔 길이별 추가 팁 (limb_type) ────────────────
LIMB_TIPS: dict = {
    "long_arms": (
        "팔이 길어 롤업 소매나 3/4 소매가 잘 어울립니다. "
        "소매 끝 디테일을 활용하면 세련된 느낌을 줄 수 있습니다."
    ),
    "short_arms": (
        "긴 소매나 소매 끝에 포인트가 있는 디자인이 팔 라인을 자연스럽게 연장해 줍니다."
    ),
    "balanced_limbs": (
        "팔 길이가 전체 비례와 잘 맞아 소매 길이 선택이 자유롭습니다."
    ),
}


# ────────────────────────────────────────────────
# 스타일 추천 함수
# ────────────────────────────────────────────────

def recommend_style(classification: dict) -> dict:
    """
    분류 결과를 받아 스타일 추천 딕셔너리를 반환합니다.

    탐색 우선순위:
      1. STYLE_RULES[gender][body_type][proportion]  — 가장 구체적인 규칙
      2. STYLE_RULES[gender][body_type]["default"]   — proportion 세부 규칙 없을 때
      3. STYLE_RULES["unspecified"][body_type]["default"]  — gender 매핑 실패 시
      4. STYLE_RULES["unspecified"]["balanced"]["default"] — 최종 폴백

    extra_tip은 추천 규칙 팁 + proportion 팁 + limb 팁을
    줄바꿈(\n)으로 연결합니다.

    Args:
        classification (dict): classify_all()의 반환값

    Returns:
        dict: {
            "top"      : list[str],
            "bottom"   : list[str],
            "fit"      : str,
            "avoid"    : list[str],
            "extra_tip": str,
        }
    """
    gender     = classification.get("gender",     "unspecified")
    body_type  = classification.get("body_type",  "balanced")
    proportion = classification.get("proportion", "balanced_proportion")
    limb_type  = classification.get("limb_type",  "balanced_limbs")

    # ── gender 폴백 ──
    gender_rules = STYLE_RULES.get(gender) or STYLE_RULES["unspecified"]

    # ── body_type 폴백 ──
    body_rules = gender_rules.get(body_type) or gender_rules.get("balanced", {})

    # ── proportion 세부 규칙 → 없으면 default ──
    rule = body_rules.get(proportion) or body_rules.get("default", {})

    # ── 기본 추천 복사 ──
    recommendation = {
        "top"      : list(rule.get("top",    [])),
        "bottom"   : list(rule.get("bottom", [])),
        "fit"      : rule.get("fit",    ""),
        "avoid"    : list(rule.get("avoid",  [])),
        "extra_tip": rule.get("extra_tip", ""),
    }

    # ── 각 팁을 줄바꿈으로 자연스럽게 연결 ──
    proportion_tip = PROPORTION_TIPS.get(proportion, "")
    limb_tip       = LIMB_TIPS.get(limb_type, "")

    tips = [t for t in [recommendation["extra_tip"], proportion_tip, limb_tip] if t]
    recommendation["extra_tip"] = "\n".join(tips)

    return recommendation

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

def recommend_style(classification: dict, user_input: dict | None = None) -> dict:
    """
    체형 분류 + 사용자 선호를 바탕으로 스타일 추천 반환
    최종 튜닝 버전:
    - build_type 반영
    - preferred_style 우선순위 강화
    - preferred_fit 반영
    - 추천 개수 제한
    - 너무 많이 누적되지 않게 핵심 아이템만 선택
    """
    if user_input is None:
        user_input = {}

    gender = classification.get("gender", "unspecified")
    body_type = classification.get("body_type", "balanced")
    proportion = classification.get("proportion", "balanced_proportion")
    build_type = classification.get("build_type", "regular_build")

    preferred_fit = (user_input.get("preferred_fit") or "").strip().lower()
    preferred_style = (user_input.get("preferred_style") or "").strip().lower()

    # ------------------------------------------------
    # 1차 기본 추천 선택
    # ------------------------------------------------
    gender_rules = STYLE_RULES.get(gender, STYLE_RULES["male"])
    body_rules = gender_rules.get(body_type, gender_rules["balanced"])
    selected = body_rules.get(proportion, body_rules.get("default"))

    result = {
        "top": list(selected["top"]),
        "bottom": list(selected["bottom"]),
        "fit": selected["fit"],
        "avoid": list(selected["avoid"]),
        "extra_tip": selected["extra_tip"],
    }

    # ------------------------------------------------
    # 2차 build_type 반영 (핵심만 추가)
    # ------------------------------------------------
    if build_type == "slim_build":
        result["top"] += ["볼륨감 있는 셔츠", "텍스처 니트"]
        result["bottom"] += ["세미와이드 팬츠"]
        result["avoid"] += ["지나치게 마른 느낌을 강조하는 초슬림핏"]
        result["fit"] += " 마른 체형은 지나치게 붙는 핏보다 적당한 볼륨이 있는 실루엣이 좋습니다."
        result["extra_tip"] += "\n몸이 너무 얇아 보이지 않도록 레이어드와 텍스처를 활용하세요."

    elif build_type == "stocky_build":
        result["top"] += ["세로 디테일 상의", "구조적인 셔츠 재킷"]
        result["bottom"] += ["스트레이트 핏 팬츠"]
        result["avoid"] += ["부피감을 과하게 키우는 두꺼운 오버핏", "상하의 모두 루즈한 실루엣"]
        result["fit"] += " 체격감이 있는 경우 지나친 오버핏보다 정리된 실루엣이 더 안정적입니다."
        result["extra_tip"] += "\n체격감이 있다면 부피를 더 키우기보다 세로선과 정돈된 라인으로 균형을 잡는 것이 좋습니다."

    else:
        result["extra_tip"] += "\n현재 체격감은 보통 수준으로 판단되어 기본 추천 방향을 유지해도 잘 어울립니다."

    # ------------------------------------------------
    # 3차 preferred_style 반영 (우선순위 높음)
    # ------------------------------------------------
    if preferred_style == "street":
        # 기존 top/bottom을 완전히 덮진 않되, 스트릿 대표 아이템을 우선 배치
        result["top"] = [
            "그래픽 후드",
            "워크 자켓",
            "세로 디테일 상의",
            *result["top"],
        ]
        result["bottom"] = [
            "카고 팬츠",
            "와이드 데님",
            *result["bottom"],
        ]
        result["avoid"] += ["상하의 모두 과한 오버사이즈 스트릿 코디"]
        if build_type == "stocky_build":
            result["avoid"] += ["너무 부한 패딩"]
        result["extra_tip"] += "\n스트릿 스타일은 볼륨감보다 실루엣 정리가 더 중요합니다."

    elif preferred_style == "minimal":
        result["top"] = [
            "무지 셔츠",
            "미니멀 블레이저",
            "톤다운 니트",
            *result["top"],
        ]
        result["bottom"] = [
            "다크톤 슬랙스",
            "군더더기 없는 스트레이트 팬츠",
            *result["bottom"],
        ]
        result["extra_tip"] += "\n미니멀 스타일은 단순할수록 핏과 소재 정리가 중요합니다."

    elif preferred_style == "casual":
        result["top"] = [
            "기본 맨투맨",
            "캐주얼 셔츠",
            *result["top"],
        ]
        result["bottom"] = [
            "기본 데님",
            "치노 팬츠",
            *result["bottom"],
        ]
        result["extra_tip"] += "\n캐주얼 스타일은 편안함과 정돈된 실루엣의 균형이 중요합니다."

    # ------------------------------------------------
    # 4차 preferred_fit 반영
    # ------------------------------------------------
    if preferred_fit == "oversized":
        result["top"] = ["박스핏 셔츠", *result["top"]]
        result["bottom"] = ["와이드 스트레이트 팬츠", *result["bottom"]]
        result["extra_tip"] += "\n오버사이즈를 선호하더라도 상하의 볼륨 균형을 맞추세요."
        if build_type == "stocky_build":
            result["avoid"] += ["극단적인 벌룬 실루엣"]

    elif preferred_fit == "slim":
        result["top"] = ["정돈된 실루엣의 셔츠", *result["top"]]
        result["bottom"] = ["슬림 스트레이트 팬츠", *result["bottom"]]
        result["extra_tip"] += "\n슬림핏은 지나치게 달라붙지 않게 약간의 여유를 남기는 것이 좋습니다."

    elif preferred_fit == "loose":
        result["top"] = ["루즈 셔츠", *result["top"]]
        result["bottom"] = ["루즈 스트레이트 팬츠", *result["bottom"]]
        result["extra_tip"] += "\n루즈핏은 편하지만 전체 라인이 흐트러지지 않게 정리해야 합니다."

    elif preferred_fit == "regular":
        result["top"] = ["기본 셔츠", "스탠다드 자켓", *result["top"]]
        result["bottom"] = ["레귤러 스트레이트 팬츠", *result["bottom"]]
        result["extra_tip"] += "\n레귤러핏은 가장 안정적이므로 소재와 색감으로 차별화를 주는 것이 좋습니다."

    # ------------------------------------------------
    # 5차 중복 제거
    # ------------------------------------------------
    result["top"] = list(dict.fromkeys(result["top"]))
    result["bottom"] = list(dict.fromkeys(result["bottom"]))
    result["avoid"] = list(dict.fromkeys(result["avoid"]))

    # ------------------------------------------------
    # 6차 개수 제한 (중요)
    # ------------------------------------------------
    result["top"] = result["top"][:5]
    result["bottom"] = result["bottom"][:4]
    result["avoid"] = result["avoid"][:4]

    return result

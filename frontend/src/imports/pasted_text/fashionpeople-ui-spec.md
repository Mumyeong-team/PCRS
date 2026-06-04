Prompt:

Design a premium web UI for a graduation project called FashionPeople, an AI-based body analysis and style recommendation web service.

The UI should feel like a mix of:

Apple-style minimalism
luxury fashion editorial branding
soft cinematic transitions
clean, premium, modern, and easy to understand for first-time users

Use a white / black / soft beige / soft mint color palette with elegant typography and generous spacing.
The service is not a shopping mall first — it is a body analysis + AI styling recommendation platform.

1. Core product structure

This web service works with the following real backend flow:

User photo upload or camera capture → body analysis data generation → classifier → style context generation → AI style recommendation result

So the UI should be designed in a way that is easy to connect later with real backend APIs.

The three main service features must be clearly visible in the main screen:

3D 코디
사진 촬영 및 분석
AI 스타일 추천

These should be shown as premium feature cards or tiles in the main page.

2. Landing page

Create a luxurious landing page with:

full-screen cinematic fashion background
centered logo or brand title: FashionPeople
subtitle: AI 기반 체형 분석 및 스타일 추천 웹서비스
a small but elegant “시작하기” button
Important interaction:

When the user clicks 시작하기, the next screen should transition smoothly and elegantly, almost like a premium app intro or presentation slide.

Recommended transition mood:

fade-in + slight zoom
smooth upward motion
soft blur disappearing
premium, calm, polished
not flashy, not game-like
3. Main feature page after clicking 시작하기

After the smooth transition, show a main feature page that introduces the 3 core functions.

Layout:

Use a modern clean layout with 3 large cards or sections.

Feature 1: 3D 코디
visually stylish card
explain that users can preview styling results in a more visual way
include fashion-oriented imagery or silhouette placeholder
premium and futuristic feeling
Feature 2: 사진 촬영 및 분석
explain that users can upload or capture body photos
this feature connects to body analysis pipeline
show camera / body outline / analysis style visuals
should feel reliable and technical but still elegant
Feature 3: AI 스타일 추천
explain that after body classification, AI generates styling suggestions and explanation
should look smart, personalized, and refined
can use recommendation cards, text summary blocks, or styling guide layout

This page should feel like the true home dashboard of the service.

4. Recommended page structure

Please redesign the information architecture to fit the real project logic.

Pages:
A. Landing Page
cinematic visual
logo
subtitle
시작하기 button
smooth transition to next page
B. Main Feature / Home Page

Show the 3 major functions:

3D 코디
사진 촬영 및 분석
AI 스타일 추천

Also include a short service summary and a call-to-action button like:

“분석 시작하기”
or “사진 업로드하기”
C. Upload / Input Page

This page should be designed so it can later connect easily with backend input fields.

Include:

photo upload or camera capture area
front photo / side photo concept
user input form section

Recommended input fields:

성별
키
몸무게
상의 사이즈
하의 사이즈
선호 핏
선호 스타일

This page should clearly separate:

image input area
body info form
analysis start button
D. Analysis Result Page

This page should not only show body analysis, but also the final AI recommendation together.

Because the real backend flow is:
classifier + style context + AI recommendation

So this page should include these sections:

체형 분석 결과
body type
proportion
limb type
측정/분석 요약
shoulder / waist / ratio / proportion summary
shown as elegant data cards
AI 스타일 추천 요약
short summary paragraph
추천 아이템
recommended clothing/item keywords
피해야 할 스타일
avoid items or styling direction
스타일링 팁
natural AI-generated tips
optional button:
“3D 코디 보기”
“다시 분석하기”

This page should look polished, editorial, and easy to read.

5. UI/UX direction

The UI should be:

premium
minimal
clear
presentation-friendly for a graduation project
realistic for future backend integration

Avoid making it look like a generic shopping mall.
It should feel like an AI fashion analysis service.

Use:

soft rounded cards
thin borders
glassmorphism only where needed
elegant motion
editorial typography
large visual sections with breathing room
6. Backend-friendly design considerations

Design the UI with clear separation between these data blocks so developers can connect them later:

Input data block
gender
height
weight
top size
bottom size
preferred fit
preferred style
uploaded front image
uploaded side image
Analysis result block
body_type
proportion
limb_type
body metrics summary
AI recommendation block
summary
recommended items
avoid items
styling tips

Use card sections or modular components so that each part can later map naturally to API response fields.

7. Style keywords

Use these visual keywords:

luxury fashion tech
premium AI service
editorial layout
minimal but warm
clean whitespace
smooth transition
elegant interaction
modern Korean fashion app feeling
easy for backend integration later
8. Final design goal

The final design should feel like:
“A premium AI-powered body analysis and styling platform for personalized fashion guidance.”

It must clearly communicate the 3 core features:

3D 코디
사진 촬영 및 분석
AI 스타일 추천

And it must include a smooth transition from the landing page when the user clicks 시작하기

Make the layout clean, premium, realistic, and easy to implement in React component structure.
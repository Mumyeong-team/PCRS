<h1 align="center">FashionPeople</h1>

<p align="center">
  <b>사진 속 체형 데이터를 기반으로 AI 스타일 추천과 3D 피팅을 연결하는 개인 맞춤형 패션 분석 시스템</b>
</p>

<p align="center">
  <img src="docs/preview.png" width="760" alt="FashionPeople Preview">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10-3776AB?style=for-the-badge&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white">
  <img src="https://img.shields.io/badge/MediaPipe-Pose-4285F4?style=for-the-badge&logo=google&logoColor=white">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black">
  <img src="https://img.shields.io/badge/Three.js-3D-black?style=for-the-badge&logo=threedotjs&logoColor=white">
  <img src="https://img.shields.io/badge/MySQL-Database-4479A1?style=for-the-badge&logo=mysql&logoColor=white">
</p>

---

## 프로젝트 핵심 개념

**FashionPeople**은 사용자가 업로드한 정면·측면 이미지를 분석하여 신체 좌표를 추출하고, 체형 데이터를 기반으로 AI 스타일 추천과 3D 아바타 피팅을 제공하는 웹 기반 개인 맞춤형 패션 분석 서비스입니다.

기존 온라인 쇼핑몰은 주로 사이즈표, 리뷰, 구매 이력, 인기 상품 데이터를 기준으로 옷을 추천합니다. 하지만 이러한 방식은 사용자의 실제 신체 비율이나 체형 차이를 충분히 반영하지 못합니다.

FashionPeople은 사용자의 이미지에서 직접 신체 데이터를 추출하고, 이를 기반으로 체형 분류, AI 스타일 추천, 3D 아바타 변형 기능을 연결하여 더 개인화된 의류 선택 경험을 제공하는 것을 목표로 합니다.

---

## 왜 필요한가

온라인 의류 쇼핑에서 가장 큰 문제 중 하나는 **입어보기 전까지 핏을 정확히 알기 어렵다**는 점입니다.

사람마다 어깨 너비, 허리 비율, 상체와 하체 길이, 팔 길이 등이 다르기 때문에 같은 사이즈의 옷이라도 실제 착용감은 달라질 수 있습니다.

FashionPeople은 이러한 문제를 해결하기 위해 단순 사이즈 추천이 아닌 **사용자 신체 데이터 기반 추천**을 제공합니다.

```text
기존 방식
사이즈표 / 리뷰 / 구매 이력 기반 추천

FashionPeople
사용자 신체 좌표 / 체형 비율 / 3D 아바타 기반 추천

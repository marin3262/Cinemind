# Cinemind 프로젝트 개발 환경 설정 가이드

이 문서는 새로운 컴퓨터에서 Cinemind 프로젝트 개발을 이어가기 위한 설정 방법을 안내합니다.

## 1. 사전 준비: 버전 관리 도구 설치 (권장)

개발 환경의 충돌을 방지하기 위해 각 언어의 버전 관리 도구를 사용하는 것을 강력히 권장합니다.

- **Python 버전 관리자 (`pyenv`):**
  - Homebrew를 사용하는 경우: `brew install pyenv`
  - 또는 [pyenv 설치 가이드](https://github.com/pyenv/pyenv#installation)를 참고하여 설치합니다.

- **Node.js 버전 관리자 (`nvm`):**
  - [nvm 설치 가이드](https://github.com/nvm-sh/nvm#installing-and-updating)를 참고하여 설치합니다.

---

## 2. 백엔드 설정 (`cinemind-backend`)

백엔드는 Python 3.10과 FastAPI를 기반으로 합니다.

1.  **Python 3.10 설치 및 설정:**
    ```bash
    # pyenv를 사용하여 Python 3.10.x 버전 설치 (예: 3.10.14)
    pyenv install 3.10.14

    # cinemind-backend 디렉토리로 이동
    cd cinemind-backend

    # 이 디렉토리에서 사용할 Python 버전을 3.10으로 지정
    pyenv local 3.10.14
    ```

2.  **가상 환경 생성 및 활성화:**
    ```bash
    # venv라는 이름의 가상 환경 생성
    python -m venv venv

    # 가상 환경 활성화 (macOS/Linux)
    source venv/bin/activate
    ```

3.  **의존성 라이브러리 설치:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **환경 변수 설정:**
    - `cinemind-backend` 디렉토리에 있는 `.env` 파일을 열어보세요.
    - 파일 안에 `SUPABASE_URL`, `SUPABASE_KEY`, `KOBIS_API_KEY` 등 API 키와 URL이 필요합니다.
    - 기존 프로젝트의 값을 복사하여 붙여넣거나, 새로운 키를 발급받아 입력해야 합니다.

5.  **백엔드 서버 실행:**
    ```bash
    # uvicorn을 사용하여 FastAPI 서버 실행
    uvicorn main:app --reload
    ```
    - 이제 `http://127.0.0.1:8000`에서 백엔드 API가 실행됩니다.

---

## 3. 클라이언트 설정 (`cinemind-client`)

클라이언트는 React Native (Expo) 기반으로, Node.js 환경이 필요합니다.

1.  **Node.js 22.x (LTS) 설치 및 설정:**
    ```bash
    # nvm을 사용하여 Node.js 22.x 버전 설치
    nvm install 22

    # cinemind-client 디렉토리로 이동
    cd ../cinemind-client

    # 이 디렉토리에서 사용할 Node.js 버전을 22.x로 지정
    nvm use 22
    ```

2.  **의존성 라이브러리 설치:**
    ```bash
    npm install
    ```
    *만약 `package-lock.json` 관련 오류가 발생하면 `npm install --legacy-peer-deps`를 시도해볼 수 있습니다.*

3.  **클라이언트 앱 실행:**
    ```bash
    # Expo 개발 서버 시작
    npm start
    ```
    - 터미널에 QR 코드가 나타납니다.
    - 휴대폰의 Expo Go 앱으로 QR 코드를 스캔하여 앱을 실행하거나,
    - 터미널에서 `i`를 눌러 iOS 시뮬레이터, `a`를 눌러 Android 시뮬레이터에서 앱을 실행할 수 있습니다.

---

이제 백엔드와 클라이언트가 모두 실행 가능한 상태가 되었습니다.

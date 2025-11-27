# Cinemind 프로젝트 이전 과정 기록

이 문서는 Cinemind 프로젝트를 새 컴퓨터로 이전하기 위해 진행한 모든 과정을 기록한 로그입니다.

## 1. 초기 분석 및 목표 설정

- **목표:** `Cinemind` 프로젝트를 다른 컴퓨터로 옮겨 개발을 계속할 수 있도록 준비합니다.
- **프로젝트 구조 분석:**
    - `cinemind-backend`: Python 3.10 기반의 백엔드.
    - `cinemind-client`: React Native (Expo) 기반의 클라이언트.
- **결정:** 버전 관리 및 이전을 위해 Git을 우선적으로 사용하기로 결정. 실패 시, 압축 파일을 사용하는 대안을 마련.

## 2. Git을 이용한 이전 시도

### 2.1. 로컬 Git 저장소 설정

1.  **Git 저장소 초기화:**
    - 프로젝트 루트 디렉토리에서 Git 저장소를 생성했습니다.
    - **명령어:** `git init`

2.  **`.gitignore` 파일 생성:**
    - `node_modules`, `venv`, `.env` 등 불필요하거나 민감한 파일들을 Git 추적에서 제외하기 위해 `.gitignore` 파일을 생성했습니다.
    - **명령어:** `write_file`을 사용하여 아래 내용으로 `.gitignore` 생성.
      ```
      # Python / Venv
      venv/
      __pycache__/
      *.pyc

      # Node / Expo
      node_modules/
      .expo/
      npm-debug.log*
      yarn-debug.log*
      yarn-error.log*

      # Secrets
      .env

      # OS-specific
      .DS_Store
      ```

3.  **파일 추가 및 중첩 저장소 문제 발생:**
    - 모든 파일을 Git에 추가(`git add .`)하는 과정에서 `cinemind-client`가 이미 독립적인 Git 저장소여서 경고가 발생했습니다.
    - **문제:** 이대로 커밋하면 클라이언트 코드가 제대로 포함되지 않습니다.

4.  **중첩 저장소 문제 해결:**
    - **1단계:** `git rm -f --cached cinemind-client` 명령어로 Git 추적에서 `cinemind-client` 디렉토리를 강제로 제외했습니다.
    - **2단계:** `rm -rf cinemind-client/.git` 명령어로 `cinemind-client` 하위의 `.git` 폴더를 삭제하여 일반 폴더로 만들었습니다.
    - **3단계:** `git add .` 명령어를 다시 실행하여 모든 프로젝트 파일을 성공적으로 추가했습니다.

5.  **최초 커밋 생성:**
    - `git commit -m "Initial commit"` 명령어로 프로젝트의 현재 상태를 로컬 저장소에 "Initial commit"이라는 이름으로 저장했습니다.

### 2.2. GitHub 원격 저장소 연동 및 실패

1.  **GitHub 원격 저장소 생성:**
    - 사용자가 GitHub에서 `https://github.com/marin3262/Cinemind.git` 주소의 비어있는 원격 저장소를 생성했습니다.

2.  **원격 저장소 연결:**
    - `git remote add origin https://github.com/marin3262/Cinemind.git` 명령어로 로컬 저장소와 원격 저장소를 연결했습니다.

3.  **Push 실패 및 네트워크 문제 확인:**
    - `git push -u origin master` 명령어로 코드를 GitHub에 올리려 했으나, `Failed to connect to github.com port 443` 오류가 발생하며 실패했습니다.

## 3. 네트워크 문제 진단 및 해결 시도

1.  **`curl`을 이용한 기본 연결 테스트:**
    - `curl -v https://github.com` 명령어를 실행한 결과, 정상적으로 GitHub 서버와 통신하고 웹페이지 내용을 받아오는 것을 확인했습니다.
    - **결론:** 일반적인 인터넷 연결이나 방화벽 문제는 아님. Git 프로그램에 한정된 문제일 가능성 제기.

2.  **Git 프록시 설정 확인:**
    - `git config --global --get http.proxy` 와 `git config --global --get https.proxy` 명령어를 통해 Git에 잘못된 프록시가 설정되어 있는지 확인했으나, 설정된 값이 없음을 확인했습니다.

3.  **최종 결론:**
    - 원인을 파악하기 어려운 복잡한 네트워크 환경 문제로 판단하고, 더 이상 시간을 소요하기보다 처음에 계획했던 대안으로 전환하기로 결정했습니다.

## 4. 대안: 압축 파일을 이용한 이전

1.  **프로젝트 압축:**
    - `zip -r Cinemind.zip . -x "cinemind-client/node_modules/*" -x "cinemind-backend/venv/*" -x "*.DS_Store*" -x "cinemind-backend/__pycache__/*" -x ".git/*"` 명령어를 사용하여, 불필요한 대용량 폴더와 Git 설정 폴더를 제외한 순수 소스 코드와 설정 파일들만 `Cinemind.zip` 파일로 압축했습니다.

2.  **최종 이전 방법 안내:**
    - 생성된 `Cinemind.zip` 파일을 USB, 클라우드 등을 통해 새 컴퓨터로 옮긴 후 압축을 해제합니다.
    - 함께 포함된 `Cinemind_Setup_Guide.md` 파일의 안내에 따라 개발 환경을 설정하여 작업을 재개합니다.

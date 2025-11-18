-- movies 테이블에 감성 태그를 저장하기 위한 emotional_tags 컬럼을 추가합니다.
-- TEXT 배열 타입으로, 여러 개의 태그를 저장할 수 있습니다.
ALTER TABLE movies
ADD COLUMN emotional_tags TEXT[];

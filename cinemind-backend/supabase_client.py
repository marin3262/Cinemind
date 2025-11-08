# supabase_client.py
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# .env 파일에서 환경 변수 불러오기
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
service_key: str = os.environ.get("SUPABASE_SERVICE_KEY")

# 일반 사용자용 클라이언트 (anon key 사용)
supabase: Client = create_client(url, key)

# 관리자용 클라이언트 (service_role key 사용, RLS 우회)
supabase_admin: Client = create_client(url, service_key)

import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

pool = None
DATABASE_URL = os.getenv("DATABASE_URL")

async def init_pool():
    global pool
    pool = await asyncpg.create_pool(
        dsn=DATABASE_URL,
        min_size=1,
        max_size=int(os.getenv("DB_CONN_LIMIT", 10)),
        command_timeout=10,
        statement_cache_size=0
    )

async def query(sql, params=None):
    global pool

    if pool is None:
        await init_pool()
    try:
        async with pool.acquire() as conn:
            if sql.strip().upper().startswith(("INSERT", "UPDATE", "DELETE")):
                await conn.execute(sql, *(params or []))
                return

            rows = await conn.fetch(sql, *(params or []))
            return [dict(row) for row in rows]
    except Exception as e:
        raise
        """import traceback
        traceback.print_exc()
        print(e)"""
async def close_pool():
    global pool
    if pool:
        await pool.close()
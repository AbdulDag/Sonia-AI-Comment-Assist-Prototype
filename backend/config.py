from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    reddit_subreddits: str = (
        "anxiety,mentalhealth,selfimprovement,therapyquestions,"
        "college,getdisciplined,decidingtobebetter"
    )
    relevance_threshold: float = 0.4
    database_path: str = "./sonia_comments.db"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()

FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    procps \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 sandbox

WORKDIR /sandbox

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY sandbox_server.py .

RUN chown -R sandbox:sandbox /sandbox

USER sandbox

EXPOSE 8080

CMD ["uvicorn", "sandbox_server:app", "--host", "0.0.0.0", "--port", "8080"]
FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

# Install jq for parsing Home Assistant options
RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY keepalive.js ./
COPY run.sh ./

RUN chmod a+x ./run.sh

ENV NODE_ENV=production
CMD [ "./run.sh" ]

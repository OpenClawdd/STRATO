FROM node:20

# Hugging Face standard user setup
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy package files
COPY --chown=user package.json ./

# Install dependencies, bypassing dependency resolution issues from eslint/knip
RUN npm install --legacy-peer-deps

# Copy application files
COPY --chown=user . .

# Expose the required port
EXPOSE 7860
ENV PORT=7860

CMD ["npm", "start"]

FROM debian:bullseye-slim

ARG ASTERISK_VERSION=20

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential \
    wget \
    curl \
    libssl-dev \
    libncurses5-dev \
    libnewt-dev \
    libxml2-dev \
    libsqlite3-dev \
    uuid-dev \
    libjansson-dev \
    libedit-dev \
    libsrtp2-dev \
    libspandsp-dev \
    libopus-dev \
    libvorbis-dev \
    pkg-config \
    subversion \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src

RUN wget -q http://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VERSION}-current.tar.gz \
    && tar xzf asterisk-${ASTERISK_VERSION}-current.tar.gz \
    && rm asterisk-${ASTERISK_VERSION}-current.tar.gz \
    && mv asterisk-${ASTERISK_VERSION}.* asterisk

WORKDIR /usr/src/asterisk

RUN ./configure --with-jansson-bundled --with-pjproject-bundled 2>&1 | tail -20
RUN make menuselect.makeopts
RUN menuselect/menuselect \
    --enable chan_sip \
    --enable res_srtp \
    --enable codec_opus \
    --enable res_http_websocket \
    --enable res_ari \
    --enable res_ari_asterisk \
    --enable res_ari_bridges \
    --enable res_ari_channels \
    --enable res_ari_device_states \
    --enable res_ari_endpoints \
    --enable res_ari_events \
    --enable res_ari_mailboxes \
    --enable res_ari_playbacks \
    --enable res_ari_recordings \
    --enable res_ari_sounds \
    --enable app_queue \
    --enable app_voicemail \
    --enable app_record \
    --enable app_dial \
    --enable app_playback \
    --enable app_waitforsilence \
    menuselect.makeopts

RUN make -j$(nproc) && make install && make samples

# Copy custom config files
COPY conf/ /etc/asterisk/

# Create required directories
RUN mkdir -p /var/spool/asterisk/monitor \
    && mkdir -p /var/spool/asterisk/voicemail \
    && mkdir -p /var/log/asterisk \
    && mkdir -p /var/run/asterisk \
    && chmod -R 755 /var/spool/asterisk \
    && chmod -R 755 /var/log/asterisk

EXPOSE 5060/udp 5060/tcp 5061/tcp 8088/tcp 10000-10200/udp

CMD ["asterisk", "-f", "-vvv"]

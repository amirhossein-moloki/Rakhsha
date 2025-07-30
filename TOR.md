# Connecting Through Tor / اتصال از طریق شبکه Tor

To enhance privacy and anonymity, you can configure the Rakhsha server to run as a Tor Onion Service. This makes the server accessible only through the Tor network, hiding its IP address and location.

برای افزایش حریم خصوصی و ناشناسی، می‌توانید سرور رخشان را به عنوان یک "سرویس پنهان" (Onion Service) در شبکه Tor پیکربندی کنید. این کار باعث می‌شود سرور فقط از طریق شبکه Tor قابل دسترس باشد و آدرس IP و موقعیت مکانی آن مخفی بماند.

---

## English Instructions

### Prerequisites
- You must have Tor installed and running on your server. You can find instructions at [torproject.org](https://www.torproject.org/download/).

### Configuration Steps

1.  **Locate your Tor configuration file (`torrc`).**
    -   On Debian/Ubuntu, this is usually at `/etc/tor/torrc`.
    -   On macOS (if installed via Homebrew), it might be at `/usr/local/etc/tor/torrc`.

2.  **Add the Onion Service configuration to `torrc`.**
    Open the `torrc` file and add the following lines. Assuming your Rakhsha server runs on port `3000`.

    ```
    HiddenServiceDir /var/lib/tor/rakhsha_service/
    HiddenServicePort 3000 127.0.0.1:3000
    ```
    -   `HiddenServiceDir`: This is the directory where Tor will store information about your onion service, including its private key. Make sure this directory is readable and writable by the user running Tor.
    -   `HiddenServicePort`: This line maps the virtual port `3000` of the onion service to the TCP port `3000` on your local machine where the Rakhsha server is running.

3.  **Restart the Tor service.**
    After saving the `torrc` file, restart Tor for the changes to take effect.
    ```bash
    sudo systemctl restart tor
    ```
    Or on macOS:
    ```bash
    brew services restart tor
    ```

4.  **Find your Onion Address.**
    Once Tor restarts, it will create the directory specified in `HiddenServiceDir`. Inside that directory, you will find a file named `hostname`. The content of this file is your unique `.onion` address.
    ```bash
    sudo cat /var/lib/tor/rakhsha_service/hostname
    ```
    The output will look something like `your_unique_address.onion`. This is the address your clients will use to connect to the server through the Tor network.

5.  **Client-Side Configuration.**
    Clients must use a Tor-enabled client (like Tor Browser for web clients, or a mobile client configured to use a Tor proxy) to connect to the `.onion` address.

---

## دستورالعمل فارسی

### پیش‌نیازها
- شما باید Tor را بر روی سرور خود نصب و اجرا کرده باشید. دستورالعمل نصب را می‌توانید در [torproject.org](https://www.torproject.org/download/) پیدا کنید.

### مراحل پیکربندی

۱. **فایل پیکربندی Tor (`torrc`) خود را پیدا کنید.**
    - در Debian/Ubuntu، این فایل معمولاً در مسیر `/etc/tor/torrc` قرار دارد.
    - در macOS (اگر با Homebrew نصب شده باشد)، ممکن است در مسیر `/usr/local/etc/tor/torrc` باشد.

۲. **پیکربندی سرویس پنهان را به `torrc` اضافه کنید.**
    فایل `torrc` را باز کرده و خطوط زیر را به آن اضافه کنید. فرض بر این است که سرور رخشان شما روی پورت `3000` اجرا می‌شود.

    ```
    HiddenServiceDir /var/lib/tor/rakhsha_service/
    HiddenServicePort 3000 127.0.0.1:3000
    ```
    - `HiddenServiceDir`: این دایرکتوری است که Tor اطلاعات مربوط به سرویس پنهان شما، از جمله کلید خصوصی آن را در آن ذخیره می‌کند. اطمینان حاصل کنید که این دایرکتوری توسط کاربری که Tor را اجرا می‌کند، قابل خواندن و نوشتن باشد.
    - `HiddenServicePort`: این خط، پورت مجازی `3000` سرویس پنهان را به پورت TCP `3000` روی دستگاه محلی شما که سرور رخشان روی آن در حال اجرا است، متصل می‌کند.

۳. **سرویس Tor را مجدداً راه‌اندازی کنید.**
    پس از ذخیره فایل `torrc`، Tor را مجدداً راه‌اندازی کنید تا تغییرات اعمال شوند.
    ```bash
    sudo systemctl restart tor
    ```
    یا در macOS:
    ```bash
    brew services restart tor
    ```

۴. **آدرس Onion خود را پیدا کنید.**
    پس از راه‌اندازی مجدد، Tor دایرکتوری مشخص‌شده در `HiddenServiceDir` را ایجاد می‌کند. داخل آن دایرکتوری، فایلی به نام `hostname` پیدا خواهید کرد. محتوای این فایل، آدرس `.onion` منحصر به فرد شماست.
    ```bash
    sudo cat /var/lib/tor/rakhsha_service/hostname
    ```
    خروجی چیزی شبیه به `your_unique_address.onion` خواهد بود. این آدرسی است که کلاینت‌های شما برای اتصال به سرور از طریق شبکه Tor استفاده خواهند کرد.

۵. **پیکربندی سمت کلاینت.**
    کلاینت‌ها باید از یک برنامه مجهز به Tor (مانند Tor Browser برای کلاینت‌های وب، یا یک کلاینت موبایل که برای استفاده از پروکسی Tor پیکربندی شده) برای اتصال به آدرس `.onion` استفاده کنند.

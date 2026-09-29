import os
import json
import time
from playwright.sync_api import sync_playwright

artifact_dir = r"C:\Users\Pc\.gemini\antigravity\brain\64f90dc8-5350-46db-b5b8-74dadff3b578"
os.makedirs(artifact_dir, exist_ok=True)

console_logs = []
network_failures = []

def handle_console(msg):
    console_logs.append(f"[{msg.type}] {msg.text}")
    if msg.type == 'error':
        print(f"[BROWSER ERROR] {msg.text}")

def handle_request_failed(req):
    network_failures.append(f"{req.method} {req.url} - {req.failure}")
    print(f"[NET FAILED] {req.method} {req.url}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()

    page.on("console", handle_console)
    page.on("requestfailed", handle_request_failed)

    print("1. Acessando https://somos1-tattoo-studio.vercel.app...")
    page.goto("https://somos1-tattoo-studio.vercel.app", wait_until="domcontentloaded", timeout=45000)
    time.sleep(4)
    
    page.screenshot(path=os.path.join(artifact_dir, "01_home_loaded.png"))
    print("Screenshot 1 salvo: 01_home_loaded.png")

    # Verificar se estamos na Galeria ou se precisamos navegar
    print("2. Verificando navegação para Galeria IA...")
    # Procurar link ou aba da Galeria IA
    galeria_btn = page.locator("text=Galeria").first
    if galeria_btn.is_visible():
        galeria_btn.click()
        time.sleep(2)
        page.screenshot(path=os.path.join(artifact_dir, "02_galeria_navigated.png"))
        print("Screenshot 2 salvo: 02_galeria_navigated.png")

    # 3. Testar abertura do modal de conexão Meta / Instagram
    print("3. Testando modal de conexões Meta / Instagram...")
    ig_badge = page.locator("text=@somos1tattoo").first
    if not ig_badge.is_visible():
        ig_badge = page.locator("text=Conectar Canais Meta").first

    if ig_badge.is_visible():
        print("Clicando no badge @somos1tattoo...")
        ig_badge.click()
        time.sleep(2)
        page.screenshot(path=os.path.join(artifact_dir, "03_modal_meta_open.png"))
        print("Screenshot 3 salvo: 03_modal_meta_open.png")

        # Verificar se o campo de token manual está visível
        token_input = page.locator("input[placeholder*='EAA']").first
        token_visible = token_input.is_visible()
        print(f"Campo de token manual Meta visível: {token_visible}")

        # Clicar na aba Buffer Schedule
        buffer_tab = page.locator("button:has-text('Buffer Schedule')").first
        if buffer_tab.is_visible():
            buffer_tab.click()
            time.sleep(1.5)
            page.screenshot(path=os.path.join(artifact_dir, "04_modal_buffer_tab.png"))
            print("Screenshot 4 salvo: 04_modal_buffer_tab.png")
            
            buf_token_input = page.locator("input[placeholder*='Buffer'], input[placeholder*='Token']").first
            print(f"Campo de token Buffer visível: {buf_token_input.is_visible()}")

        # Fechar o modal
        close_btn = page.locator("button.absolute, button:has-text('Fechar'), svg.lucide-x").first
        if close_btn.is_visible():
            close_btn.click()
            time.sleep(1)

    # 4. Testar o PostEditor
    print("4. Testando abertura do PostEditor...")
    first_post = page.locator("div[class*='group relative'], div[class*='cursor-pointer']").filter(has_text="24").first
    if not first_post.is_visible():
        first_post = page.locator("div[class*='cursor-pointer']").first

    if first_post.is_visible():
        first_post.click()
        time.sleep(2)
        page.screenshot(path=os.path.join(artifact_dir, "05_post_editor_open.png"))
        print("Screenshot 5 salvo: 05_post_editor_open.png")

        # Clicar no botão de calendário / agendamento do editor
        schedule_icon_btn = page.locator("button:has(svg.lucide-calendar)").first
        if schedule_icon_btn.is_visible():
            schedule_icon_btn.click()
            time.sleep(1.5)
            page.screenshot(path=os.path.join(artifact_dir, "06_post_editor_schedule_drawer.png"))
            print("Screenshot 6 salvo: 06_post_editor_schedule_drawer.png")

        # Verificar botões de publicação
        ig_pub_btn = page.locator("button:has-text('Instagram')").first
        buf_pub_btn = page.locator("button:has-text('Buffer')").first
        print(f"Botão Instagram no editor visível: {ig_pub_btn.is_visible()}")
        print(f"Botão Buffer no editor visível: {buf_pub_btn.is_visible()}")

    # Resumo
    print("\n--- RESUMO DO TESTE ---")
    print(f"Total de logs de console: {len(console_logs)}")
    print(f"Falhas de rede: {len(network_failures)}")
    if network_failures:
        for nf in network_failures[:5]:
            print(" -", nf)

    browser.close()
    print("Teste finalizado com sucesso!")

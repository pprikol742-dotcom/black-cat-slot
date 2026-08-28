# Сборка APK для RuStore

Все команды — в PowerShell (не в cmd.exe: строка приглашения должна
начинаться с `PS`).

## Первая настройка

```powershell
cd C:\black-cat-slot
```
```powershell
$env:JAVA_HOME = "C:\program files\android\android studio\jbr"
```
```powershell
npm install
```
```powershell
npx cap add android
```

## Иконки

```powershell
Copy-Item "C:\black-cat-slot\android-icons\*" "C:\black-cat-slot\android\app\src\main\res\" -Recurse -Force
```

## Сборка

```powershell
npm run sync
```
```powershell
cd C:\black-cat-slot\android
```
```powershell
.\gradlew assembleRelease
```

APK появится в `android\app\build\outputs\apk\release\app-release.apk`.

## Подпись

Создать `android/keystore.properties`:

```
storeFile=release-key.jks
storePassword=ПАРОЛЬ
keyAlias=blackcat
keyPassword=ПАРОЛЬ
```

Файл `.jks` положить в `android/app/`. Оба файла уже в `.gitignore` —
в репозиторий они не попадут.

**Пароль от хранилища сохрани отдельно.** Потерянный пароль означает
новый `applicationId` и потерю всех установок — так уже было с ПДД.

## Реклама VK Ads

Нативный плагин `VkAds` регистрируется в
`android/app/src/main/java/ru/blackcat/treasures/MainActivity.java`.
Пока плагина нет, `platform.showRewarded()` просто вернёт `false`,
и игра продолжит работать — награда за ролик будет недоступна,
всё остальное в порядке.

Слоты подставить в `AD_SLOTS` в `src/platform/index.ts`.

## Версии при обновлении

В `android/app/build.gradle` поднимать `versionCode` на единицу каждый
раз. RuStore отклоняет загрузку с уже использованным `versionCode`.

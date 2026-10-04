package co.truepower.thermal

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebChromeClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import java.io.ByteArrayOutputStream
import java.util.Base64
import java.util.UUID
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {
    private val logTag = "TruePowerThermal"
    private lateinit var webView: WebView
    private lateinit var loading: ProgressBar
    private lateinit var errorPanel: View
    private val sppUuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { permissions ->
        if (permissions.values.any { it }) {
            toast("Bluetooth permission granted. Try printing again.")
        } else {
            toast("Bluetooth permission is required to print.")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = FrameLayout(this)
        webView = WebView(this).apply {
            id = View.generateViewId()
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            )
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.mediaPlaybackRequiresUserGesture = true
            settings.userAgentString = "${settings.userAgentString} TruePowerThermal/2.0"
            CookieManager.getInstance().setAcceptCookie(true)
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                    loading.visibility = View.VISIBLE
                    errorPanel.visibility = View.GONE
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    loading.visibility = View.GONE
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?,
                ) {
                    if (request?.isForMainFrame == true) {
                        loading.visibility = View.GONE
                        errorPanel.visibility = View.VISIBLE
                    }
                }
            }
            webChromeClient = WebChromeClient()
            addJavascriptInterface(ThermalBridge(), "AndroidThermalPrinter")
        }

        loading = ProgressBar(this).apply {
            layoutParams = FrameLayout.LayoutParams(64, 64, android.view.Gravity.CENTER)
        }
        errorPanel = buildErrorPanel()
        root.addView(webView)
        root.addView(loading)
        root.addView(errorPanel)
        setContentView(root)

        webView.loadUrl(BuildConfig.WEB_APP_URL)

        requestBluetoothPermissionsIfNeeded()
        val demoProducts = intent.getIntExtra("demo_products", 0)
        if (demoProducts > 0) {
            webView.postDelayed({ printStressReceipt(demoProducts) }, 1500)
        } else if (intent.getBooleanExtra("demo_print", false)) {
            webView.postDelayed({ printDemoReceipt() }, 1500)
        }
    }

    private fun buildErrorPanel(): View {
        val panel = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setPadding(48, 32, 48, 32)
            setBackgroundColor(android.graphics.Color.WHITE)
            visibility = View.GONE
        }
        panel.addView(TextView(this).apply {
            text = "TruePower is offline"
            textSize = 22f
            setTextColor(android.graphics.Color.rgb(20, 35, 70))
            gravity = android.view.Gravity.CENTER
        })
        panel.addView(TextView(this).apply {
            text = "Connect to the internet, then retry to open the receipt builder."
            textSize = 15f
            setTextColor(android.graphics.Color.DKGRAY)
            gravity = android.view.Gravity.CENTER
            setPadding(0, 12, 0, 20)
        })
        panel.addView(Button(this).apply {
            text = "Retry TruePower"
            setOnClickListener {
                panel.visibility = View.GONE
                webView.loadUrl(BuildConfig.WEB_APP_URL)
            }
        })
        return panel
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    private fun requestBluetoothPermissionsIfNeeded() {
        if (android.os.Build.VERSION.SDK_INT < 31) return

        val permissions = arrayOf(
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.BLUETOOTH_SCAN,
        )
        if (permissions.any { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }) {
            permissionLauncher.launch(permissions)
        }
    }

    private fun hasBluetoothPermission(): Boolean {
        return android.os.Build.VERSION.SDK_INT < 31 ||
            checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("MissingPermission")
    private fun printBytes(bytes: ByteArray) {
        val printerBytes = preparePrinterBytes(bytes)
        if (!hasBluetoothPermission()) {
            toast("Allow Bluetooth permission before printing.")
            return
        }

        val manager = getSystemService(BluetoothManager::class.java)
        val adapter = manager?.adapter
        if (adapter == null || !adapter.isEnabled) {
            toast("Turn on Bluetooth and pair the Xprinter first.")
            return
        }

        val bondedDevices = adapter.bondedDevices.toList()
        if (bondedDevices.isEmpty()) {
            toast("Pair an XP or Xprinter device in Android Bluetooth settings first.")
            return
        }

        val printerMatches = bondedDevices.filter { device -> isLikelyPrinter(device.name.orEmpty()) }
        if (printerMatches.size == 1) {
            sendToPrinter(printerMatches.first(), printerBytes)
            return
        }

        val candidates = if (printerMatches.isNotEmpty()) printerMatches else bondedDevices
        if (candidates.size == 1) {
            sendToPrinter(candidates.first(), printerBytes)
            return
        }

        showPrinterPicker(candidates, printerBytes)
    }

    private fun normalizeLineEndings(bytes: ByteArray): ByteArray {
        val normalized = ArrayList<Byte>(bytes.size + 32)
        bytes.forEachIndexed { index, value ->
            if (value == 0x0A.toByte() && (index == 0 || bytes[index - 1] != 0x0D.toByte())) {
                normalized.add(0x0D.toByte())
            }
            normalized.add(value)
        }
        return normalized.toByteArray()
    }

    private fun preparePrinterBytes(bytes: ByteArray): ByteArray {
        val ascii = bytes.toString(Charsets.US_ASCII)
        // The XP-P203A is currently in TSC/TSPL mode. Convert the receipt
        // text produced by the web builder from ESC/POS into a 58mm label.
        if (ascii.startsWith("SIZE ")) return normalizeTsplSize(bytes)
        if (bytes.size < 2 || bytes[0] != 0x1B.toByte() || bytes[1] != 0x40.toByte()) {
            return normalizeLineEndings(bytes)
        }

        val receiptText = ascii
            .replace("\u001B@", "")
            .replace("\u001Ba\u0000", "")
            .replace("\u001BE\u0000", "")
            .replace("\u001BE\u0001", "")
            .replace("\r\n", "\n")
            .replace('\r', '\n')
            .filter { it == '\n' || it == '\t' || it.code >= 0x20 }

        val sourceLines = receiptText.split('\n').map { it.trim() }.ifEmpty { listOf("TruePower receipt") }
        var inItems = false
        val compactLines = sourceLines.flatMap { rawLine ->
            val line = rawLine.trim()
            when {
                line == "ITEM" || line.startsWith("ITEM ") -> {
                    inItems = true
                    listOf(line)
                }
                inItems && line.startsWith("TOTAL") -> {
                    inItems = false
                    listOf(line)
                }
                inItems && line.isNotBlank() && !line.all { it == '-' } -> {
                    // Receipts created by older web builds used `KSh40,000`,
                    // while newer receipts use `KSh 40,000`. Accept both
                    // forms so products are never dropped during conversion.
                    val amountMatch = Regex("(?i)(KSh\\s*.*)$").find(line)
                    if (amountMatch == null) {
                        // Continuation lines are already represented by the
                        // compact first line of the same product.
                        emptyList()
                    } else {
                        val amount = amountMatch.groupValues[1].trim()
                            .replace(Regex("(?i)KSh\\s*"), "KSh ")
                            .replace(Regex("\\.00\\b"), "")
                        val beforeAmount = line.substring(0, amountMatch.range.first).trim()
                        val words = beforeAmount.split(Regex("\\s+")).filter(String::isNotEmpty)
                        val quantity = words.lastOrNull { it.matches(Regex("(?i)x\\d+(\\.\\d+)?")) } ?: "x1"
                        val descriptionWords = words.filterNot { it.equals(quantity, ignoreCase = true) }
                        val compactDescription = descriptionWords.take(3).joinToString(" ") +
                            if (descriptionWords.size > 3) "..." else ""
                        listOf("$compactDescription|${listOf(amount, quantity).filter(String::isNotEmpty).joinToString(" ")}")
                    }
                }
                else -> {
                    val lower = line.lowercase()
                    val normalized = when {
                        lower == "truepower solutions" || lower == "truepower solution" ->
                            "TRUEPOWER SOLUTIONS"
                        lower == "receipt" -> "RECEIPT"
                        lower.contains("terms & conditions") || lower.contains("terms and conditions") ->
                            "TERMS & CONDITIONS"
                        lower.contains("pochi la biashara") ->
                            "Pochi: " + Regex("\\d[\\d ]+").find(line)?.value?.trim().orEmpty()
                        lower.contains("call or whatsapp") ->
                            "Call/WhatsApp: " + Regex("\\+?\\d[\\d ]+").find(line)?.value?.trim().orEmpty()
                        else -> line
                    }
                    listOf(normalized)
                }
            }
        }
        val printableWidthDots = 384 // XP-P203A: 48mm printable width at 203dpi.
        val guaranteedLines = compactLines.toMutableList().apply {
            if (none { it.contains("TERMS", ignoreCase = true) }) add("TERMS & CONDITIONS")
            if (none { it.contains("Payment after", ignoreCase = true) }) add("Payment after installation")
            if (none { it.contains("Pochi", ignoreCase = true) }) add("Pochi: 0701 039256")
            if (none { it.contains("warranty", ignoreCase = true) }) add("2 years warranty")
            if (none { it.contains("Thank you", ignoreCase = true) }) add("Thank you for shopping with us.")
            if (none { it.contains("WhatsApp", ignoreCase = true) }) add("Call/WhatsApp: +254701039256")
            if (none { it.contains("truepower.co.ke", ignoreCase = true) }) add("www.truepower.co.ke")
        }
        val separatedLines = buildList {
            guaranteedLines.forEach { line ->
                val normalized = line.trim()
                if (normalized == "RECEIPT" || normalized == "ITEM" || normalized.startsWith("TOTAL") ||
                    normalized == "TERMS & CONDITIONS" || normalized.startsWith("Thank you")) {
                    if (isNotEmpty() && last() != "--------------------------------") add("--------------------------------")
                }
                add(normalized)
            }
        }
        val preparedLines = separatedLines.flatMap { rawLine ->
            // Product rows are rendered as two fixed columns below. Keep the
            // separator intact so a long name cannot wrap over the amount.
            listOf(rawLine)
        }.flatMap { rawLine ->
            if (rawLine.contains('|')) return@flatMap listOf(rawLine)
            val words = rawLine.split(Regex("\\s+")).filter(String::isNotEmpty)
            if (words.isEmpty()) return@flatMap listOf("")
            val chunks = mutableListOf<String>()
            var current = ""
            words.forEach { word ->
                if (word.length > 42) {
                    if (current.isNotEmpty()) { chunks.add(current); current = "" }
                    word.chunked(42).forEach { chunks.add(it) }
                } else if (current.isEmpty()) {
                    current = word
                } else if ((current.length + word.length + 1) <= 42) {
                    current += " $word"
                } else {
                    chunks.add(current)
                    current = word
                }
            }
            if (current.isNotEmpty()) chunks.add(current)
            chunks
        }
        val lineHeight = 40
        fun productDescriptionLines(value: String): List<String> {
            val words = value.trim().split(Regex("\\s+")).filter(String::isNotEmpty)
            if (words.isEmpty()) return listOf("")

            val chunks = mutableListOf<String>()
            var current = ""
            words.forEach { word ->
                if (word.length > 22) {
                    if (current.isNotEmpty()) { chunks.add(current); current = "" }
                    // Never split a product word into fragments. A whole word
                    // is preferable to output such as `rainshowe` + `r`.
                    chunks.add(word)
                } else if (current.isEmpty()) {
                    current = word
                } else if (current.length + word.length + 1 <= 22) {
                    current += " $word"
                } else {
                    chunks.add(current)
                    current = word
                }
            }
            if (current.isNotEmpty()) chunks.add(current)
            return chunks.ifEmpty { listOf("") }
        }

        val renderedLineCount = preparedLines.sumOf { rawLine ->
            val productParts = rawLine.split('|', limit = 2)
            if (productParts.size == 2) productDescriptionLines(productParts[0]).size else 1
        }
        val heightMm = maxOf(100, ((renderedLineCount * lineHeight + 36) * 25.4 / 203).toInt() + 4)
        val tspl = StringBuilder()
            .append("SIZE 58 mm,").append(heightMm).append(" mm\r\n")
            .append("GAP 2 mm,0 mm\r\n")
            .append("DENSITY 12\r\n")
            .append("DIRECTION 1\r\n")
            .append("CLS\r\n")

        var y = 12
        preparedLines.forEach { rawLine ->
            val line = rawLine.replace('"', '\'')
            if (line == "--------------------------------") {
                tspl.append("BAR 4,").append(y + 6).append(",376,2\r\n")
                y += lineHeight
                return@forEach
            }
            val productParts = line.split('|', limit = 2)
            if (productParts.size == 2) {
                val descriptions = productDescriptionLines(productParts[0])
                val amount = productParts[1].trim()
                descriptions.forEachIndexed { lineIndex, description ->
                    tspl.append("TEXT 4,").append(y + lineIndex * lineHeight)
                        .append(",\"1\",0,1,1,\"").append(description).append("\"\r\n")
                }
                tspl.append("TEXT 190,").append(y)
                    .append(",\"1\",0,1,1,\"").append(amount).append("\"\r\n")
                y += descriptions.size * lineHeight
                return@forEach
            }
            val productRow = line.contains("KSh", ignoreCase = true) && line.contains(".")
            val itemHeading = line.contains("ITEM", ignoreCase = true) &&
                line.contains("AMOUNT", ignoreCase = true)
            val prominent = line.length <= 22 && (line.contains("Pochi", ignoreCase = true) ||
                line.contains("WhatsApp", ignoreCase = true) || line.startsWith("+") ||
                line.startsWith("www", ignoreCase = true) || line.startsWith("http", ignoreCase = true))
            val large = !productRow && (y == 12 || line == "TRUEPOWER SOLUTIONS" || line == "RECEIPT" ||
                line.startsWith("TOTAL") || line == "TERMS & CONDITIONS")
            val font = when {
                large -> "3"
                prominent -> "2"
                itemHeading -> "2"
                productRow -> "1"
                else -> "1"
            }
            val charWidth = when (font) {
                "3" -> 16
                "2" -> 12
                else -> 8
            }
            val x = if (productRow) 4 else maxOf(4, (printableWidthDots - line.length * charWidth) / 2)
            tspl.append("TEXT ").append(x).append(',').append(y)
                .append(",\"").append(font).append("\",0,1,1,\"").append(line).append("\"\r\n")
            y += lineHeight
        }
        tspl.append("PRINT 1,1\r\n")
        return tspl.toString().toByteArray(Charsets.US_ASCII)
    }

    private fun normalizeTsplSize(bytes: ByteArray): ByteArray {
        val source = bytes.toString(Charsets.US_ASCII)
        val maxY = Regex("(?m)^(?:TEXT|BAR|BITMAP)\\s+\\d+,([0-9]+)")
            .findAll(source)
            .mapNotNull { it.groupValues.getOrNull(1)?.toIntOrNull() }
            .maxOrNull() ?: 600
        // Keep a generous bottom margin so the final thank-you/website lines
        // are never placed beyond the declared label height.
        val heightMm = maxOf(100, ((maxY + 72) * 25.4 / 203).toInt() + 4)
        val resized = source.replaceFirst(
            Regex("SIZE\\s+58\\s+mm,[^\\r\\n]+"),
            "SIZE 58 mm,${heightMm} mm",
        )
        return normalizeLineEndings(resized.toByteArray(Charsets.US_ASCII))
    }

    private fun bitmapToTspl(bitmap: Bitmap): ByteArray {
        val targetWidth = 384
        val targetHeight = maxOf(1, (bitmap.height.toFloat() * targetWidth / bitmap.width).toInt())
        val scaled = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)
        val rowBytes = (targetWidth + 7) / 8
        val raster = ByteArray(rowBytes * targetHeight)
        for (y in 0 until targetHeight) {
            for (x in 0 until targetWidth) {
                val pixel = scaled.getPixel(x, y)
                val gray = (0.299 * android.graphics.Color.red(pixel) +
                    0.587 * android.graphics.Color.green(pixel) +
                    0.114 * android.graphics.Color.blue(pixel)).toInt()
                if (gray < 205) {
                    raster[y * rowBytes + (x / 8)] =
                        (raster[y * rowBytes + (x / 8)].toInt() or (0x80 shr (x % 8))).toByte()
                }
            }
        }
        if (scaled !== bitmap) scaled.recycle()

        val heightMm = maxOf(60, (targetHeight * 25.4 / 203).toInt() + 4)
        val header = ("SIZE 58 mm,${heightMm} mm\r\n" +
            "GAP 2 mm,0 mm\r\n" +
            "DENSITY 12\r\n" +
            "DIRECTION 1\r\n" +
            "CLS\r\n" +
            "BITMAP 0,0,$rowBytes,$targetHeight,0,").toByteArray(Charsets.US_ASCII)
        val footer = "\r\nPRINT 1,1\r\n".toByteArray(Charsets.US_ASCII)
        return ByteArrayOutputStream(header.size + raster.size + footer.size).apply {
            write(header)
            write(raster)
            write(footer)
        }.toByteArray()
    }

    private fun printDemoReceipt() {
        val demo = ("SIZE 58 mm,220 mm\r\n" +
            "GAP 2 mm,0 mm\r\n" +
            "DENSITY 12\r\n" +
            "DIRECTION 1\r\n" +
            "CLS\r\n" +
            "TEXT 52,24,\"3\",0,1,1,\"TRUEPOWER SOLUTIONS\"\r\n" +
            "TEXT 144,60,\"2\",0,1,1,\"+254701039256\"\r\n" +
            "TEXT 72,88,\"2\",0,1,1,\"www.truepower.co.ke\"\r\n" +
            "BAR 4,116,376,2\r\n" +
            "TEXT 150,148,\"3\",0,1,1,\"RECEIPT\"\r\n" +
            "TEXT 104,188,\"1\",0,1,1,\"No. 1067\"\r\n" +
            "TEXT 104,216,\"1\",0,1,1,\"Date: 2026-09-14\"\r\n" +
            "TEXT 18,256,\"2\",0,1,1,\"ITEM                 AMOUNT\"\r\n" +
            "BAR 4,284,376,2\r\n" +
            "TEXT 4,312,\"1\",0,1,1,\"Black Anlabeier.... KSh40,000 x1\"\r\n" +
            "TEXT 4,340,\"1\",0,1,1,\"Acqua Storm Ultra.. KSh21,000 x1\"\r\n" +
            "TEXT 4,368,\"1\",0,1,1,\"Anlabeier Instant... KSh14,999 x1\"\r\n" +
            "TEXT 4,396,\"1\",0,1,1,\"Duo Shower Quadra.. KSh14,500 x1\"\r\n" +
            "TEXT 4,424,\"1\",0,1,1,\"Rain Shower Pump... KSh18,000 x1\"\r\n" +
            "TEXT 4,452,\"1\",0,1,1,\"Hand Shower........ KSh8,000 x1\"\r\n" +
            "TEXT 4,480,\"1\",0,1,1,\"Tankless Heater.... KSh32,000 x1\"\r\n" +
            "TEXT 4,508,\"1\",0,1,1,\"Instant Shower..... KSh25,000 x1\"\r\n" +
            "TEXT 4,536,\"1\",0,1,1,\"Solar Heater....... KSh45,000 x1\"\r\n" +
            "TEXT 4,564,\"1\",0,1,1,\"Pressure Pump...... KSh12,000 x1\"\r\n" +
            "BAR 4,592,376,2\r\n" +
            "TEXT 102,624,\"2\",0,1,1,\"TOTAL KSh 230,499.00\"\r\n" +
            "BAR 4,656,376,2\r\n" +
            "TEXT 92,688,\"2\",0,1,1,\"TERMS & CONDITIONS\"\r\n" +
            "TEXT 74,720,\"1\",0,1,1,\"Payment after installation\"\r\n" +
            "TEXT 94,748,\"2\",0,1,1,\"Pochi: 0701 039256\"\r\n" +
            "TEXT 130,776,\"1\",0,1,1,\"2 years warranty\"\r\n" +
            "BAR 4,804,376,2\r\n" +
            "TEXT 60,836,\"2\",0,1,1,\"Thank you for shopping\"\r\n" +
            "TEXT 160,864,\"2\",0,1,1,\"with us.\"\r\n" +
            "TEXT 75,892,\"1\",0,1,1,\"Call/WhatsApp: +254701039256\"\r\n" +
            "TEXT 132,920,\"1\",0,1,1,\"www.truepower.co.ke\"\r\n" +
            "PRINT 1,1\r\n").toByteArray(Charsets.US_ASCII)
        printBytes(demo)
    }

    private fun printStressReceipt(requestedCount: Int) {
        val count = requestedCount.coerceIn(1, 100)
        val firstProductY = 312
        val rowHeight = 28
        val footerY = firstProductY + count * rowHeight + 96
        val sizeMm = ((footerY + 180) * 25.4 / 203).toInt() + 4
        val tspl = StringBuilder()
            .append("SIZE 58 mm,").append(sizeMm).append(" mm\r\n")
            .append("GAP 2 mm,0 mm\r\nDENSITY 12\r\nDIRECTION 1\r\nCLS\r\n")
            .append("TEXT 52,24,\"3\",0,1,1,\"TRUEPOWER SOLUTIONS\"\r\n")
            .append("TEXT 144,60,\"2\",0,1,1,\"+254701039256\"\r\n")
            .append("TEXT 72,88,\"2\",0,1,1,\"www.truepower.co.ke\"\r\n")
            .append("BAR 4,116,376,2\r\n")
            .append("TEXT 150,148,\"3\",0,1,1,\"RECEIPT\"\r\n")
            .append("TEXT 104,188,\"1\",0,1,1,\"No. STRESS\"\r\n")
            .append("TEXT 18,256,\"2\",0,1,1,\"ITEM                 AMOUNT\"\r\n")
            .append("BAR 4,284,376,2\r\n")
        for (index in 1..count) {
            val y = firstProductY + (index - 1) * rowHeight
            val amount = 1000 + index * 250
            tspl.append("TEXT 4,").append(y)
                .append(",\"1\",0,1,1,\"Product ").append(index)
                .append("........ KSh").append(amount).append(" x1\"\r\n")
        }
        tspl.append("BAR 4,").append(firstProductY + count * rowHeight + 8).append(",376,2\r\n")
            .append("TEXT 102,").append(footerY).append(",\"2\",0,1,1,\"TOTAL KSh ").append(count * 1000 + count * (count + 1) * 125).append(".00\"\r\n")
            .append("BAR 4,").append(footerY + 36).append(",376,2\r\n")
            .append("TEXT 92,").append(footerY + 68).append(",\"2\",0,1,1,\"TERMS & CONDITIONS\"\r\n")
            .append("TEXT 74,").append(footerY + 100).append(",\"1\",0,1,1,\"Payment after installation\"\r\n")
            .append("TEXT 94,").append(footerY + 128).append(",\"2\",0,1,1,\"Pochi: 0701 039256\"\r\n")
            .append("BAR 4,").append(footerY + 156).append(",376,2\r\n")
            .append("TEXT 60,").append(footerY + 188).append(",\"2\",0,1,1,\"Thank you for shopping\"\r\n")
            .append("TEXT 160,").append(footerY + 216).append(",\"2\",0,1,1,\"with us.\"\r\n")
            .append("TEXT 75,").append(footerY + 244).append(",\"1\",0,1,1,\"Call/WhatsApp: +254701039256\"\r\n")
            .append("TEXT 132,").append(footerY + 272).append(",\"1\",0,1,1,\"www.truepower.co.ke\"\r\n")
            .append("PRINT 1,1\r\n")
        printBytes(tspl.toString().toByteArray(Charsets.US_ASCII))
    }

    private fun isLikelyPrinter(name: String): Boolean {
        val value = name.uppercase()
        val printerTerms = listOf(
            "XP", "XPRINTER", "P203", "P323", "Q200", "PRINTER", "THERMAL",
            "POS", "MTP", "RPP", "ZJ", "58", "80",
        )
        if (printerTerms.any(value::contains)) return true

        val nonPrinterTerms = listOf(
            "PHONE", "REALME", "SAMSUNG", "BUDS", "HEADSET", "EARBUD", "WATCH",
            "SPEAKER", "KEYBOARD", "MOUSE", "LAPTOP", "COMPUTER", "CAR AUDIO",
        )
        return value.isNotBlank() && nonPrinterTerms.none(value::contains)
    }

    @SuppressLint("MissingPermission")
    private fun showPrinterPicker(devices: List<BluetoothDevice>, bytes: ByteArray) {
        val labels = devices.map { device ->
            "${device.name?.takeIf { it.isNotBlank() } ?: "Unnamed device"}\n${device.address}"
        }.toTypedArray()

        runOnUiThread {
            AlertDialog.Builder(this)
                .setTitle("Choose thermal printer")
                .setItems(labels) { _, which -> sendToPrinter(devices[which], bytes) }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    @SuppressLint("MissingPermission")
    private fun sendToPrinter(printer: BluetoothDevice, bytes: ByteArray) {
        thread(name = "truepower-thermal-print") {
            try {
                getSystemService(BluetoothManager::class.java)?.adapter?.cancelDiscovery()
                Log.i(logTag, "Printing ${bytes.size} bytes to ${printer.name} (${printer.address})")
                var printed = false
                var lastError: Exception? = null
                val socketFactories = listOf(
                    { printer.createInsecureRfcommSocketToServiceRecord(sppUuid) },
                    { printer.createRfcommSocketToServiceRecord(sppUuid) },
                )

                for (createSocket in socketFactories) {
                    try {
                        createSocket().use { socket ->
                            socket.connect()
                            socket.outputStream.use { output ->
                                output.write(bytes)
                                output.flush()
                                Thread.sleep(500)
                            }
                        }
                        printed = true
                        break
                    } catch (error: Exception) {
                        lastError = error
                        Log.w(logTag, "Printer socket attempt failed: ${error.message}")
                    }
                }
                if (!printed) throw lastError ?: IllegalStateException("Could not connect to printer")
                Log.i(logTag, "Receipt sent successfully")
                toast("Receipt sent to ${printer.name ?: "printer"}.")
            } catch (error: Exception) {
                toast("Bluetooth print failed: ${error.message ?: "unknown error"}")
            }
        }
    }

    private fun toast(message: String) {
        runOnUiThread { Toast.makeText(this, message, Toast.LENGTH_LONG).show() }
    }

    inner class ThermalBridge {
        @JavascriptInterface
        fun printReceipt(base64EscPos: String) {
            try {
                printBytes(Base64.getDecoder().decode(base64EscPos))
            } catch (_: IllegalArgumentException) {
                toast("The receipt data was invalid.")
            }
        }

        @JavascriptInterface
        fun printImage(base64Png: String) {
            try {
                val imageBytes = Base64.getDecoder().decode(base64Png)
                val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                if (bitmap == null) {
                    toast("The receipt image could not be decoded.")
                    return
                }
                printBytes(bitmapToTspl(bitmap))
                bitmap.recycle()
            } catch (_: IllegalArgumentException) {
                toast("The receipt image data was invalid.")
            }
        }
    }
}

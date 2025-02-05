class Calculator {
    constructor() {
        this.currentValue = '0';
        this.previousValue = null;
        this.operation = null;
        this.newNumber = true;
    }

    updateDisplay(display) {
        display.textContent = this.currentValue;
    }

    handleNumber(num, display) {
        if (this.newNumber) {
            this.currentValue = num;
            this.newNumber = false;
        } else {
            this.currentValue = this.currentValue === '0' ? num : this.currentValue + num;
        }
        this.updateDisplay(display);
    }

    handleOperator(op, display) {
        if (this.operation && !this.newNumber) {
            this.calculate(display);
        }
        this.previousValue = this.currentValue;
        this.operation = op;
        this.newNumber = true;
    }

    calculate(display) {
        if (this.previousValue === null || this.newNumber) return;

        const prev = parseFloat(this.previousValue);
        const current = parseFloat(this.currentValue);
        let result;

        switch (this.operation) {
            case '+':
                result = prev + current;
                break;
            case '-':
                result = prev - current;
                break;
            case '×':
                result = prev * current;
                break;
            case '÷':
                result = prev / current;
                break;
            default:
                return;
        }

        this.currentValue = result.toString();
        this.operation = null;
        this.newNumber = true;
        this.updateDisplay(display);
    }

    clear(display) {
        this.currentValue = '0';
        this.previousValue = null;
        this.operation = null;
        this.newNumber = true;
        this.updateDisplay(display);
    }

    clearEntry(display) {
        this.currentValue = '0';
        this.newNumber = true;
        this.updateDisplay(display);
    }
}

function createCalculator() {
    const content = `
        <div class="calculator">
            <div class="calculator-display">0</div>
            <div class="calculator-buttons">
                <div class="calculator-button" data-action="clear">C</div>
                <div class="calculator-button" data-action="clear">E</div>
                <div class="calculator-button" data-action="operator">=</div>
                <div class="calculator-button" data-action="operator">×</div>
                <div class="calculator-button" data-number>7</div>
                <div class="calculator-button" data-number>8</div>
                <div class="calculator-button" data-number>9</div>
                <div class="calculator-button" data-action="operator">÷</div>
                <div class="calculator-button" data-number>4</div>
                <div class="calculator-button" data-number>5</div>
                <div class="calculator-button" data-number>6</div>
                <div class="calculator-button" data-action="operator">-</div>
                <div class="calculator-button" data-number>1</div>
                <div class="calculator-button" data-number>2</div>
                <div class="calculator-button" data-number>3</div>
                <div class="calculator-button" data-action="equals">=</div>
                <div class="calculator-button wide" data-number>0</div>
                <div class="calculator-button" data-number>.</div>
            </div>
        </div>
    `;

    const calcWindow = new Window('Calculator', content);
    calcWindow.element.classList.add('calculator-window');
    
    const calculator = new Calculator();
    const display = calcWindow.element.querySelector('.calculator-display');

    calcWindow.element.addEventListener('click', (e) => {
        const button = e.target.closest('.calculator-button');
        if (!button) return;

        if (button.hasAttribute('data-number')) {
            calculator.handleNumber(button.textContent, display);
        } else if (button.dataset.action === 'operator') {
            calculator.handleOperator(button.textContent, display);
        } else if (button.dataset.action === 'equals') {
            calculator.calculate(display);
        } else if (button.dataset.action === 'clear') {
            if (button.textContent === 'C') {
                calculator.clear(display);
            } else if (button.textContent === 'E') {
                calculator.clearEntry(display);
            }
        }
    });

    // Position the calculator window in the center of the screen
    const desktop = document.getElementById('desktop');
    const x = (desktop.offsetWidth - 180) / 2;
    const y = (desktop.offsetHeight - 260) / 2;
    calcWindow.element.style.left = `${x}px`;
    calcWindow.element.style.top = `${y}px`;
}
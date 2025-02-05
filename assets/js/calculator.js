class Calculator {
    constructor() {
        this.stack = [];
        this.currentInput = '0';
        this.newNumber = true;
    }

    updateDisplay(display) {
        display.textContent = this.currentInput;
    }

    handleNumber(num, display) {
        if (this.newNumber) {
            this.currentInput = num;
            this.newNumber = false;
        } else {
            this.currentInput = this.currentInput === '0' ? num : this.currentInput + num;
        }
        this.updateDisplay(display);
    }

    pushToStack() {
        if (!this.newNumber) {
            this.stack.push(parseFloat(this.currentInput));
            this.newNumber = true;
        }
    }

    handleOperator(op, display) {
        this.pushToStack();
        
        if (this.stack.length < 2) return;

        const b = this.stack.pop();
        const a = this.stack.pop();
        let result;

        switch (op) {
            case '+':
                result = a + b;
                break;
            case '-':
                result = a - b;
                break;
            case '×':
                result = a * b;
                break;
            case '÷':
                if (b === 0) {
                    this.currentInput = 'Error';
                    this.stack = [];
                    this.updateDisplay(display);
                    return;
                }
                result = a / b;
                break;
            case '=':
                result = b;  // Just push the last number back
                break;
        }

        this.stack.push(result);
        this.currentInput = result.toString();
        this.updateDisplay(display);
        this.newNumber = true;
    }

    clear(display) {
        this.stack = [];
        this.currentInput = '0';
        this.newNumber = true;
        this.updateDisplay(display);
    }

    clearEntry(display) {
        this.currentInput = '0';
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
                <div class="calculator-button wide" data-number>0</div>
                <div class="calculator-button" data-number>.</div>
                <div class="calculator-button plus-button" data-action="operator">+</div>
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
    const x = (desktop.offsetWidth - 160) / 2;
    const y = (desktop.offsetHeight - 255) / 2;
    calcWindow.element.style.left = `${x}px`;
    calcWindow.element.style.top = `${y}px`;
}
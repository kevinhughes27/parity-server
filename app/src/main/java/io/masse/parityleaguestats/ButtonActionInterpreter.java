package io.masse.parityleaguestats;


import android.widget.Button;

public class ButtonActionInterpreter {

    public static void interpretButton(Button button, Bookkeeper bookkeeper) {
        switch (button.getId()) {
            case R.id.btnPull:
                bookkeeper.recordPull();
                break;
            case R.id.btnThrowAway:
                bookkeeper.recordThrowAway();
                break;
            case R.id.btnDrop:
                bookkeeper.recordDrop();
                break;
        }
    }
}

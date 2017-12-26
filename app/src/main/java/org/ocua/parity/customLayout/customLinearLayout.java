package org.ocua.parity.customLayout;

import android.content.Context;
import android.util.AttributeSet;
import android.widget.Button;
import android.widget.LinearLayout;

/**
 * Created by mmasse on 14-12-07.
 */
public class customLinearLayout extends LinearLayout {

    public customLinearLayout(Context context) {
        super(context);
    }

    public customLinearLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public customLinearLayout(Context context, AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
    }

    public void setAllGravities(int gravity){
        int count = getChildCount();
        for (int i = 0; i < count; i++) {
            ((Button) getChildAt(i)).setGravity(gravity);
        }
    }
    public void setAllOnClickListeners(OnClickListener l){
        int count = getChildCount();
        for (int i = 0; i < count; i++) {
            getChildAt(i).setOnClickListener(l);
        }
    }

    public void setAllEnabled(boolean enabled){
        int count = getChildCount();
        for (int i = 0; i < count; i++) {
            getChildAt(i).setEnabled(enabled);
        }
    }

    public void setAllEnabledBut(String buttonText){
        int count = getChildCount();
        for (int i = 0; i < count; i++) {
            getChildAt(i).setEnabled(!((Button) getChildAt(i)).getText().equals(buttonText));
        }
    }

}

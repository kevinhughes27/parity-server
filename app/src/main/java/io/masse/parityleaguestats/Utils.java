package io.masse.parityleaguestats;

import android.graphics.Typeface;
import android.view.View;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.content.Context;
import android.view.View.OnClickListener;

import java.util.ArrayList;

import io.masse.parityleaguestats.model.Gender;
import io.masse.parityleaguestats.model.Team;

public class Utils {
    public static void draw_players(Context context, LinearLayout layout, OnClickListener listener, Team team, boolean isLeft) {
        int guyColour = context.getResources().getColor(R.color.rightGuysColour);
        int girlColour = context.getResources().getColor(R.color.rightGirlsColour);
        int gravity = Gravity.START;

        if (isLeft) {
            guyColour = context.getResources().getColor(R.color.leftGuysColour);
            girlColour = context.getResources().getColor(R.color.leftGirlsColour);
            gravity = Gravity.END;
        }

        int intGirls = team.sizeGirls();
        int intGuys = team.sizeGuys();

        int margin = context.getResources().getDimensionPixelSize(R.dimen.button_all_margin);
        LinearLayout.LayoutParams param = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT, 1.0f);
        param.setMargins(margin,margin,margin,margin);

        layout.removeAllViews();

        for (int i = 0; i < intGuys; i++) {
            Button btn = new Button(context);
            btn.setBackgroundColor(guyColour);
            btn.setText(team.getGuyName(i));
            layout.addView(btn);
            btn.setLayoutParams(param);
            btn.setId(i);
            btn.setTag(Gender.Male);
            btn.setGravity(gravity);
            btn.setOnClickListener(listener);
        }
        for (int i = 0; i < intGirls; i++){
            Button btn = new Button(context);
            btn.setPadding(1, 1, 1, 1);
            btn.setBackgroundColor(girlColour);
            btn.setText(team.getGirlName(i));
            layout.addView(btn);
            btn.setLayoutParams(param);
            btn.setId(i+intGuys);
            btn.setTag(Gender.Female);
            btn.setGravity(gravity);
            btn.setOnClickListener(listener);
        }
    }

    public static void bold_players(LinearLayout layout, ArrayList<String> players) {
        int count = layout.getChildCount();

        for (int i = 0; i < count; i++) {
            Button currentButton = (Button) layout.getChildAt(i);
            String playerName = currentButton.getText().toString();

            if (players.contains(playerName)) {
                currentButton.setTypeface(null, Typeface.BOLD);
            } else {
                currentButton.setTypeface(null, Typeface.NORMAL);
            }
        }
    }

    public static void show_players(LinearLayout layout, ArrayList<String> players) {
        int count = layout.getChildCount();

        for (int i = 0; i < count; i++) {
            Button currentButton = (Button) layout.getChildAt(i);
            String playerName = currentButton.getText().toString();
            currentButton.setGravity(Gravity.END);

            if (players.contains(playerName)) {
                currentButton.setVisibility(View.VISIBLE);
            } else {
                currentButton.setVisibility(View.INVISIBLE);
            }
        }
    }
}
